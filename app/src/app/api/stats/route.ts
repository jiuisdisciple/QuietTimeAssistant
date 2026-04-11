import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getKSTDate } from "@/lib/date";
import { requireApprovedUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireApprovedUser();
    const today = getKSTDate(0);
    const sixDaysAgo = getKSTDate(-6);

    const timeline = await sql`
      SELECT date, done_at
      FROM devotions
      WHERE user_id = ${user.id}
        AND date >= ${sixDaysAgo} AND date <= ${today}
      ORDER BY date ASC
    `;

    const streak = await sql`
      WITH dates AS (
        SELECT date, ROW_NUMBER() OVER (ORDER BY date DESC) as rn
        FROM devotions
        WHERE user_id = ${user.id} AND done_at IS NOT NULL
        ORDER BY date DESC
      )
      SELECT COUNT(*) as streak
      FROM dates
      WHERE date = ${today}::date - (rn - 1) * INTERVAL '1 day'
    `;

    return NextResponse.json({
      timeline: timeline.rows,
      streak: parseInt(streak.rows[0]?.streak || "0"),
    });
  } catch (error) {
    if (String(error).includes("NOT_REGISTERED")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (String(error).includes("NOT_APPROVED")) {
      return NextResponse.json({ error: "not_approved" }, { status: 403 });
    }
    console.error("Stats API error:", error);
    return NextResponse.json(
      { error: "통계를 가져올 수 없습니다" },
      { status: 500 }
    );
  }
}
