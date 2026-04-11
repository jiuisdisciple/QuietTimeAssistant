import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { requireAdmin } from "@/lib/auth";

// One-time migration endpoint: reassigns devotions/chat_sessions that
// were created before Clerk multi-user (user_id IS NULL) to the calling
// admin. Pre-Clerk there was only a single user, so all orphans belong
// to the sole user.
//
// GET  — dry run, returns counts without modifying anything
// POST — actually reassigns and returns counts

export async function GET() {
  try {
    await requireAdmin();
    const devCount = await sql`
      SELECT COUNT(*)::int AS n FROM devotions WHERE user_id IS NULL
    `;
    const sessionCount = await sql`
      SELECT COUNT(*)::int AS n FROM chat_sessions WHERE user_id IS NULL
    `;
    return NextResponse.json({
      orphan_devotions: devCount.rows[0].n,
      orphan_chat_sessions: sessionCount.rows[0].n,
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST() {
  try {
    const admin = await requireAdmin();

    const devResult = await sql`
      UPDATE devotions SET user_id = ${admin.id}
      WHERE user_id IS NULL
      RETURNING id
    `;
    const sessionResult = await sql`
      UPDATE chat_sessions SET user_id = ${admin.id}
      WHERE user_id IS NULL
      RETURNING id
    `;

    return NextResponse.json({
      claimed_by_user_id: admin.id,
      devotions_reassigned: devResult.rowCount,
      chat_sessions_reassigned: sessionResult.rowCount,
    });
  } catch (error) {
    return handleError(error);
  }
}

function handleError(error: unknown) {
  if (String(error).includes("NOT_ADMIN") || String(error).includes("NOT_APPROVED")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (String(error).includes("NOT_REGISTERED")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  console.error("claim-orphans error:", error);
  return NextResponse.json({ error: "서버 오류", detail: String(error) }, { status: 500 });
}
