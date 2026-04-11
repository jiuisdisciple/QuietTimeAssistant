import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireApprovedUser } from "@/lib/auth";

function handleAuthError(error: unknown) {
  if (String(error).includes("NOT_REGISTERED")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (String(error).includes("NOT_APPROVED")) {
    return NextResponse.json({ error: "not_approved" }, { status: 403 });
  }
  return null;
}

// GET - fetch devotion(s)
export async function GET(request: NextRequest) {
  try {
    const user = await requireApprovedUser();
    const date = request.nextUrl.searchParams.get("date");
    const limit = request.nextUrl.searchParams.get("limit");

    if (date) {
      const result = await sql`
        SELECT * FROM devotions WHERE user_id = ${user.id} AND date = ${date}
      `;
      return NextResponse.json(result.rows[0] || null);
    }

    const count = limit ? parseInt(limit) : 30;
    const result = await sql`
      SELECT d.*, p.full_reference
      FROM devotions d
      LEFT JOIN passages p ON d.date = p.date
      WHERE d.user_id = ${user.id}
      ORDER BY d.date DESC
      LIMIT ${count}
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
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
    const user = await requireApprovedUser();
    const body = await request.json();
    const { date, content, passage_reference, done } = body;

    if (!date) {
      return NextResponse.json({ error: "날짜가 필요합니다" }, { status: 400 });
    }

    if (done) {
      const result = await sql`
        INSERT INTO devotions (user_id, date, content, passage_reference, done_at, auto_saved_at)
        VALUES (${user.id}, ${date}, ${content}, ${passage_reference}, NOW(), NOW())
        ON CONFLICT (user_id, date) DO UPDATE SET
          content = ${content},
          passage_reference = ${passage_reference},
          done_at = COALESCE(devotions.done_at, NOW()),
          auto_saved_at = NOW()
        RETURNING *
      `;
      return NextResponse.json(result.rows[0]);
    } else {
      const result = await sql`
        INSERT INTO devotions (user_id, date, content, passage_reference, auto_saved_at)
        VALUES (${user.id}, ${date}, ${content}, ${passage_reference}, NOW())
        ON CONFLICT (user_id, date) DO UPDATE SET
          content = ${content},
          passage_reference = ${passage_reference},
          auto_saved_at = NOW()
        RETURNING *
      `;
      return NextResponse.json(result.rows[0]);
    }
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error("Devotion POST error:", error);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
