import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { checkDevotion } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const { date, content, passage_reference } = await request.json();

    if (!content || !passage_reference) {
      return NextResponse.json(
        { error: "큐티 내용과 본문 정보가 필요합니다" },
        { status: 400 }
      );
    }

    const report = await checkDevotion(passage_reference, content);

    // Save feedback to devotion record
    await sql`
      UPDATE devotions SET feedback_report = ${report}
      WHERE date = ${date}
    `;

    return NextResponse.json({ report });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json(
      { error: "피드백 생성 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
