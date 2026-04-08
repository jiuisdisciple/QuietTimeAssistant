import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary } from "@/lib/ai";

// Vercel Cron: runs at 5:00 AM KST daily
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in KST
    const kstDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const dateStr = kstDate.toISOString().split("T")[0];

    // Check if already fetched
    const existing = await sql`
      SELECT * FROM passages WHERE date = ${dateStr} AND ai_summary IS NOT NULL
    `;
    if (existing.rows.length > 0) {
      return NextResponse.json({ message: "Already fetched", date: dateStr });
    }

    // Fetch passage
    const passage = await fetchTodayPassage(dateStr);
    if (!passage) {
      return NextResponse.json(
        { error: "Passage not available yet" },
        { status: 404 }
      );
    }

    // Generate AI summary
    const aiSummary = await generateSummary(passage.fullReference);

    // Save to DB
    await sql`
      INSERT INTO passages (date, book_title, chapter_verse, full_reference, ai_summary)
      VALUES (${dateStr}, ${passage.bookTitle}, ${passage.chapterVerse}, ${passage.fullReference}, ${aiSummary})
      ON CONFLICT (date) DO UPDATE SET
        book_title = ${passage.bookTitle},
        chapter_verse = ${passage.chapterVerse},
        full_reference = ${passage.fullReference},
        ai_summary = ${aiSummary}
    `;

    return NextResponse.json({
      success: true,
      date: dateStr,
      reference: passage.fullReference,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
