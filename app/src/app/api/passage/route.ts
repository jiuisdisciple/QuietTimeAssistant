import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary, normalizeReference } from "@/lib/ai";
import { getKSTDate } from "@/lib/date";
import { parseReference } from "@/lib/bible";
import { requireApprovedUser } from "@/lib/auth";

export async function DELETE(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  await sql`DELETE FROM passages WHERE date = ${date}`;
  return NextResponse.json({ deleted: date });
}

// Manual passage entry. Approved users can override or seed a passage
// for a given date — useful when cdmb.link doesn't publish one (e.g.
// Sundays) or the user wants to study a different text.
export async function POST(request: NextRequest) {
  try {
    await requireApprovedUser();
    const body = await request.json();
    const { date, reference } = body as {
      date?: string;
      reference?: string;
    };

    if (!date || !reference || !reference.trim()) {
      return NextResponse.json(
        { error: "date and reference required" },
        { status: 400 }
      );
    }

    const trimmed = reference.trim();

    // Step 1: ask a cheap LLM to canonicalize free-form user input
    // (e.g. "빌립보서 1장" → "빌립보서 1:1-999", "Phil 2" → "빌립보서 2:1-999").
    // Falls back to the raw string if the model is unavailable or returns INVALID.
    const normalized = (await normalizeReference(trimmed)) || trimmed;

    // Step 2: try to parse the canonical form into book_title / chapter_verse
    // so the Bible viewer can resolve it. Fall back to raw if unparseable.
    const parsed = parseReference(normalized);
    let bookTitle: string;
    let chapterVerse: string;
    let fullReference: string;

    if (parsed) {
      // Canonical full name for book (e.g. "시" → "시편")
      const BOOK_IDS = [
        "", "창세기", "출애굽기", "레위기", "민수기", "신명기",
        "여호수아", "사사기", "룻기", "사무엘상", "사무엘하",
        "열왕기상", "열왕기하", "역대상", "역대하", "에스라",
        "느헤미야", "에스더", "욥기", "시편", "잠언", "전도서",
        "아가", "이사야", "예레미야", "예레미야애가", "에스겔",
        "다니엘", "호세아", "요엘", "아모스", "오바댜", "요나",
        "미가", "나훔", "하박국", "스바냐", "학개", "스가랴",
        "말라기", "마태복음", "마가복음", "누가복음", "요한복음",
        "사도행전", "로마서", "고린도전서", "고린도후서",
        "갈라디아서", "에베소서", "빌립보서", "골로새서",
        "데살로니가전서", "데살로니가후서", "디모데전서", "디모데후서",
        "디도서", "빌레몬서", "히브리서", "야고보서", "베드로전서",
        "베드로후서", "요한일서", "요한이서", "요한삼서", "유다서",
        "요한계시록",
      ];
      bookTitle = BOOK_IDS[parsed.book] || parsed.bookName;
      const verseRange =
        parsed.endVerse && parsed.endVerse !== parsed.startVerse
          ? `${parsed.startVerse}-${parsed.endVerse}`
          : `${parsed.startVerse}`;
      chapterVerse = `${parsed.chapter}:${verseRange}`;
      fullReference = `${bookTitle} ${chapterVerse}`;
    } else {
      // Unparseable — store raw and hope for the best. Bible viewer
      // will show the friendly "no passage" message if requested.
      bookTitle = trimmed.replace(/[\d\s:\-].*$/, "") || trimmed;
      chapterVerse = trimmed.slice(bookTitle.length).trim();
      fullReference = trimmed;
    }

    // Upsert — overwrites any existing cached entry and clears AI summary
    // so it will be regenerated for the new reference.
    const saved = await sql`
      INSERT INTO passages (date, book_title, chapter_verse, full_reference, ai_summary)
      VALUES (${date}, ${bookTitle}, ${chapterVerse}, ${fullReference}, NULL)
      ON CONFLICT (date) DO UPDATE SET
        book_title = ${bookTitle},
        chapter_verse = ${chapterVerse},
        full_reference = ${fullReference},
        ai_summary = NULL
      RETURNING *
    `;
    const row = saved.rows[0];

    // Generate AI summary in-request. Personal app, user is waiting.
    try {
      const summary = await generateSummary(fullReference);
      await sql`UPDATE passages SET ai_summary = ${summary} WHERE date = ${date}`;
      row.ai_summary = summary;
    } catch (e) {
      console.error("Manual passage AI summary failed:", e);
    }

    return NextResponse.json(row);
  } catch (error) {
    if (String(error).includes("NOT_REGISTERED")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (String(error).includes("NOT_APPROVED")) {
      return NextResponse.json({ error: "not_approved" }, { status: 403 });
    }
    console.error("Manual passage POST error:", error);
    return NextResponse.json(
      { error: "서버 오류", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date") || getKSTDate(0);
  const lazy = request.nextUrl.searchParams.get("lazy") === "1";

  try {
    // Check if we already have this passage cached
    const cached = await sql`
      SELECT * FROM passages WHERE date = ${date}
    `;

    if (cached.rows.length > 0) {
      const row = cached.rows[0];
      // Detect bad cached reference: missing space between book name and chapter
      // e.g. "시73:1-28" instead of "시편 73:1-28", or empty full_reference.
      const looksBad =
        !row.full_reference ||
        !/\s\d/.test(row.full_reference) ||
        row.book_title === "" ||
        !row.book_title;

      if (looksBad) {
        // In lazy mode, don't hit cdmb — just drop the bad row and report
        // not_cached so the UI can show the manual-entry affordance.
        if (lazy) {
          await sql`DELETE FROM passages WHERE date = ${date}`;
          return NextResponse.json(
            { error: "not_cached" },
            { status: 404 }
          );
        }

        // Re-fetch and overwrite
        const fresh = await fetchTodayPassage(date);
        if (fresh && /\s\d/.test(fresh.fullReference)) {
          const updated = await sql`
            UPDATE passages
            SET book_title = ${fresh.bookTitle},
                chapter_verse = ${fresh.chapterVerse},
                full_reference = ${fresh.fullReference},
                ai_summary = NULL
            WHERE date = ${date}
            RETURNING *
          `;
          const newRow = updated.rows[0];
          // Generate new AI summary with correct reference
          try {
            const summary = await generateSummary(newRow.full_reference);
            await sql`UPDATE passages SET ai_summary = ${summary} WHERE date = ${date}`;
            newRow.ai_summary = summary;
          } catch (e) {
            console.error("AI summary regeneration failed:", e);
          }
          return NextResponse.json(newRow);
        }

        // Bad row and refetch failed — purge so the UI can surface the
        // manual-entry affordance instead of rendering an empty reference.
        await sql`DELETE FROM passages WHERE date = ${date}`;
        return NextResponse.json(
          { error: "not_cached" },
          { status: 404 }
        );
      }

      // If cached but missing AI summary, try to generate it now
      if (!row.ai_summary) {
        try {
          const summary = await generateSummary(row.full_reference);
          await sql`
            UPDATE passages SET ai_summary = ${summary} WHERE date = ${date}
          `;
          row.ai_summary = summary;
        } catch (e) {
          console.error("AI summary generation failed:", e);
        }
      }
      return NextResponse.json(row);
    }

    // Lazy mode: don't fetch externally, don't generate AI
    if (lazy) {
      return NextResponse.json(
        { error: "not_cached" },
        { status: 404 }
      );
    }

    // Fetch from cdmb API
    const passage = await fetchTodayPassage(date);
    if (!passage) {
      return NextResponse.json(
        { error: "오늘의 본문을 아직 가져올 수 없습니다" },
        { status: 404 }
      );
    }

    // Save passage first (without AI summary) so data isn't lost if AI fails
    let savedRow;
    try {
      const result = await sql`
        INSERT INTO passages (date, book_title, chapter_verse, full_reference, ai_summary)
        VALUES (${date}, ${passage.bookTitle}, ${passage.chapterVerse}, ${passage.fullReference}, NULL)
        ON CONFLICT (date) DO UPDATE SET
          book_title = ${passage.bookTitle},
          chapter_verse = ${passage.chapterVerse},
          full_reference = ${passage.fullReference}
        RETURNING *
      `;
      savedRow = result.rows[0];
    } catch (dbError) {
      console.error("DB insert error:", dbError);
      // If DB fails, still return the fetched passage
      return NextResponse.json({
        date,
        book_title: passage.bookTitle,
        chapter_verse: passage.chapterVerse,
        full_reference: passage.fullReference,
        ai_summary: null,
      });
    }

    // Try to generate AI summary (non-blocking failure)
    try {
      const aiSummary = await generateSummary(passage.fullReference);
      await sql`
        UPDATE passages SET ai_summary = ${aiSummary} WHERE date = ${date}
      `;
      savedRow.ai_summary = aiSummary;
    } catch (aiError) {
      console.error("AI summary generation failed:", aiError);
      // Keep going — passage info is already saved
    }

    return NextResponse.json(savedRow);
  } catch (error) {
    console.error("Passage API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다", detail: String(error) },
      { status: 500 }
    );
  }
}
