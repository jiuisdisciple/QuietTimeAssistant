import { NextResponse } from "next/server";
import { getCurrentAppUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json(
      { error: "서버 오류", detail: String(error) },
      { status: 500 }
    );
  }
}
