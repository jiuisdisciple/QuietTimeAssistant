import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary } from "@/lib/ai";

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
      return NextResponse.json(cached.rows[0]);
    }

    // Fetch from API
    const passage = await fetchTodayPassage(date);
    if (!passage) {
      return NextResponse.json(
        { error: "본문을 가져올 수 없습니다" },
        { status: 404 }
      );
    }

    // Generate AI summary
    const aiSummary = await generateSummary(passage.fullReference);

    // Cache in DB
    const result = await sql`
      INSERT INTO passages (date, book_title, chapter_verse, full_reference, ai_summary)
      VALUES (${date}, ${passage.bookTitle}, ${passage.chapterVerse}, ${passage.fullReference}, ${aiSummary})
      ON CONFLICT (date) DO UPDATE SET
        book_title = ${passage.bookTitle},
        chapter_verse = ${passage.chapterVerse},
        full_reference = ${passage.fullReference},
        ai_summary = ${aiSummary}
      RETURNING *
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Passage API error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
