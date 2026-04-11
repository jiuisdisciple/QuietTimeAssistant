import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkDevotion } from "@/lib/ai";
import { requireApprovedUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const user = await requireApprovedUser();
    const { date, content, passage_reference } = await request.json();

    if (!content || !passage_reference) {
      return NextResponse.json(
        { error: "큐티 내용과 본문 정보가 필요합니다" },
        { status: 400 }
      );
    }

    const report = await checkDevotion(passage_reference, content);

    await sql`
      UPDATE devotions SET feedback_report = ${report}
      WHERE user_id = ${user.id} AND date = ${date}
    `;

    return NextResponse.json({ report });
  } catch (error) {
    if (String(error).includes("NOT_REGISTERED")) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (String(error).includes("NOT_APPROVED")) {
      return NextResponse.json({ error: "not_approved" }, { status: 403 });
    }
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "피드백 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
