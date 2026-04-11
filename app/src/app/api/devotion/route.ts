import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

// GET - fetch devotion(s)
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const limit = request.nextUrl.searchParams.get("limit");

  try {
    if (date) {
      const result = await sql`
        SELECT * FROM devotions WHERE date = ${date}
      `;
      return NextResponse.json(result.rows[0] || null);
    }

    // Return list of devotions
    const count = limit ? parseInt(limit) : 30;
    const result = await sql`
      SELECT d.*, p.full_reference
      FROM devotions d
      LEFT JOIN passages p ON d.date = p.date
      ORDER BY d.date DESC
      LIMIT ${count}
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Devotion GET error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

// POST - auto-save or done
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, content, passage_reference, done } = body;

    if (!date) {
      return NextResponse.json(
        { error: "날짜가 필요합니다" },
        { status: 400 }
      );
    }

    if (done) {
      // Mark as done with timestamp — but ONLY set done_at if it's not already set
      // (so editing after done doesn't overwrite the original completion time)
      const result = await sql`
        INSERT INTO devotions (date, content, passage_reference, done_at, auto_saved_at)
        VALUES (${date}, ${content}, ${passage_reference}, NOW(), NOW())
        ON CONFLICT (date) DO UPDATE SET
          content = ${content},
          passage_reference = ${passage_reference},
          done_at = COALESCE(devotions.done_at, NOW()),
          auto_saved_at = NOW()
        RETURNING *
      `;
      return NextResponse.json(result.rows[0]);
    } else {
      // Auto-save (never touches done_at, so editing after Done preserves timestamp)
      const result = await sql`
        INSERT INTO devotions (date, content, passage_reference, auto_saved_at)
        VALUES (${date}, ${content}, ${passage_reference}, NOW())
        ON CONFLICT (date) DO UPDATE SET
          content = ${content},
          passage_reference = ${passage_reference},
          auto_saved_at = NOW()
        RETURNING *
      `;
      return NextResponse.json(result.rows[0]);
    }
  } catch (error) {
    console.error("Devotion POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
