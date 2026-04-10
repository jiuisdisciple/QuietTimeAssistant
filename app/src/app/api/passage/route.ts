import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary } from "@/lib/ai";

export async function DELETE(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date required" }, { status: 400 });
  }
  await sql`DELETE FROM passages WHERE date = ${date}`;
  return NextResponse.json({ deleted: date });
}

export async function GET(request: NextRequest) {
  const date =
    request.nextUrl.searchParams.get("date") ||
    new Date().toISOString().split("T")[0];

  try {
    // Check if we already have this passage cached
    const cached = await sql`
      SELECT * FROM passages WHERE date = ${date}
    `;

    if (cached.rows.length > 0) {
      const row = cached.rows[0];
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
