import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    // Get last 7 days of devotion timestamps
    const timeline = await sql`
      SELECT date, done_at
      FROM devotions
      WHERE date >= CURRENT_DATE - INTERVAL '6 days'
      ORDER BY date ASC
    `;

    // Calculate streak
    const streak = await sql`
      WITH dates AS (
        SELECT date, ROW_NUMBER() OVER (ORDER BY date DESC) as rn
        FROM devotions
        WHERE done_at IS NOT NULL
        ORDER BY date DESC
      )
      SELECT COUNT(*) as streak
      FROM dates
      WHERE date = CURRENT_DATE - (rn - 1) * INTERVAL '1 day'
    `;

    return NextResponse.json({
      timeline: timeline.rows,
      streak: parseInt(streak.rows[0]?.streak || "0"),
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "통계를 가져올 수 없습니다" },
      { status: 500 }
    );
  }
}
