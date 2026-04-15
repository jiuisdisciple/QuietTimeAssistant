import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { fetchTodayPassage } from "@/lib/scraper";
import { generateSummary } from "@/lib/ai";
import { getKSTDate } from "@/lib/date";

// Fetch tomorrow's passage from cdmb and insert it for every approved user
// who doesn't already have a row for that date (DO NOTHING preserves custom entries).
// Called from Vercel Cron at 9:00, 9:30, 10:00, 10:30, 11:00, 11:30 PM KST.
async function fetchTomorrowForAllUsers(dateStr: string) {
  const passage = await fetchTodayPassage(dateStr);
  if (!passage) {
    return { skipped: true, reason: "not_available", date: dateStr };
  }

  // Generate AI summary once; reuse across all users
  let aiSummary: string | null = null;
  try {
    aiSummary = await generateSummary(passage.fullReference);
  } catch (e) {
    console.error("AI summary error for", dateStr, e);
  }

  const users = await sql`SELECT id FROM users WHERE status = 'approved'`;

  let inserted = 0;
  for (const user of users.rows) {
    const result = await sql`
      INSERT INTO passages (user_id, date, book_title, chapter_verse, full_reference, ai_summary)
      VALUES (${user.id}, ${dateStr}, ${passage.bookTitle}, ${passage.chapterVerse}, ${passage.fullReference}, ${aiSummary})
      ON CONFLICT (user_id, date) DO NOTHING
    `;
    if (result.rowCount && result.rowCount > 0) inserted++;
  }

  return {
    success: true,
    date: dateStr,
    reference: passage.fullReference,
    hasSummary: !!aiSummary,
    usersInserted: inserted,
    usersTotal: users.rows.length,
  };
}

// Vercel Cron: runs at 9:00 PM KST (21:00 KST = 12:00 UTC)
// CDMB publishes the next day's passage by ~9 PM KST, so we fetch then.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const tomorrow = getKSTDate(1);
    const result = await fetchTomorrowForAllUsers(tomorrow);
    return NextResponse.json({ tomorrow: result });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      { error: "Cron job failed", detail: String(error) },
      { status: 500 }
    );
  }
}
