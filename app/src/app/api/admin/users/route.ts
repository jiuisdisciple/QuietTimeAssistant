import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireAdmin } from "@/lib/auth";

// GET - list all users (pending first)
export async function GET() {
  try {
    await requireAdmin();
    const result = await sql`
      SELECT id, clerk_id, email, name, reason, status, is_admin, created_at, approved_at
      FROM users
      ORDER BY
        CASE status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END,
        created_at DESC
    `;
    return NextResponse.json(result.rows);
  } catch (error) {
    if (String(error).includes("NOT_ADMIN") || String(error).includes("NOT_APPROVED")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    if (String(error).includes("NOT_REGISTERED")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    console.error("Admin users GET error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}

// POST - approve or reject a user
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { userId, action } = await request.json();
    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { error: "userId and action required" },
        { status: 400 }
      );
    }
    const newStatus = action === "approve" ? "approved" : "rejected";
    const result = await sql`
      UPDATE users
      SET status = ${newStatus},
          approved_at = ${action === "approve" ? new Date().toISOString() : null}
      WHERE id = ${parseInt(userId)}
      RETURNING *
    `;
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (String(error).includes("NOT_ADMIN")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    console.error("Admin users POST error:", error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}
