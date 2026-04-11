import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "@vercel/postgres";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "no clerk user" }, { status: 401 });
    }

    const email = clerkUser.primaryEmailAddress?.emailAddress || "";

    const body = await request.json();
    const { name, reason } = body;

    if (!name || !reason) {
      return NextResponse.json(
        { error: "이름과 가입 동기가 필요합니다" },
        { status: 400 }
      );
    }

    // Check if already registered
    const existing = await sql`
      SELECT * FROM users WHERE clerk_id = ${userId}
    `;
    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    // Auto-approve admin (email matches ADMIN_EMAIL env var)
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    const isAdmin = !!adminEmail && email.toLowerCase() === adminEmail;
    const status = isAdmin ? "approved" : "pending";

    const result = await sql`
      INSERT INTO users (clerk_id, email, name, reason, status, is_admin, approved_at)
      VALUES (
        ${userId},
        ${email},
        ${name},
        ${reason},
        ${status},
        ${isAdmin},
        ${isAdmin ? new Date().toISOString() : null}
      )
      RETURNING *
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "등록 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
