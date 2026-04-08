import { NextResponse } from "next/server";
import { initDB } from "@/lib/db";

export async function POST() {
  try {
    await initDB();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Init DB error:", error);
    return NextResponse.json(
      { error: "DB 초기화 실패" },
      { status: 500 }
    );
  }
}
