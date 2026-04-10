import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary } from "@/lib/ai";

async function ensurePassage(dateStr: string) {
  // Skip if already fetched with summary
  const existing = await sql`
    SELECT * FROM passages WHERE date = ${dateStr} AND ai_summary IS NOT NULL
  `;
  if (existing.rows.length > 0) {
    return { skipped: true, date: dateStr };
  }

  const passage = await fetchTodayPassage(dateStr);
  if (!passage) {
    return { error: "Not available", date: dateStr };
  }

  let aiSummary: string | null = null;
  try {
    aiSummary = await generateSummary(passage.fullReference);
  } catch (e) {
    console.error("AI summary error for", dateStr, e);
  }

  await sql`
    INSERT INTO passages (date, book_title, chapter_verse, full_reference, ai_summary)
    VALUES (${dateStr}, ${passage.bookTitle}, ${passage.chapterVerse}, ${passage.fullReference}, ${aiSummary})
    ON CONFLICT (date) DO UPDATE SET
      book_title = ${passage.bookTitle},
      chapter_verse = ${passage.chapterVerse},
      full_reference = ${passage.fullReference},
      ai_summary = COALESCE(${aiSummary}, passages.ai_summary)
  `;

  return {
    success: true,
    date: dateStr,
    reference: passage.fullReference,
    hasSummary: !!aiSummary,
  };
}

// Vercel Cron: runs at 5:00 AM KST daily
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get today's date in KST
    const kstNow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
    );
    const today = kstNow.toISOString().split("T")[0];
    const tomorrowDate = new Date(kstNow);
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrow = tomorrowDate.toISOString().split("T")[0];

    // Fetch both today and tomorrow in parallel
    const [todayResult, tomorrowResult] = await Promise.all([
      ensurePassage(today),
      ensurePassage(tomorrow),
    ]);

    return NextResponse.json({
      today: todayResult,
      tomorrow: tomorrowResult,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", detail: String(error) },
      { status: 500 }
    );
  }
}
