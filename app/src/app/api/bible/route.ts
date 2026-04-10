import { NextRequest, NextResponse } from "next/server";
import { fetchVerses } from "@/lib/bible";

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  const version = request.nextUrl.searchParams.get("version") as
    | "KRV"
    | "ESV"
    | null;

  if (!ref || !version) {
    return NextResponse.json(
      { error: "ref and version required" },
      { status: 400 }
    );
  }

  if (version !== "KRV" && version !== "ESV") {
    return NextResponse.json(
      { error: "version must be KRV or ESV" },
      { status: 400 }
    );
  }

  try {
    const result = await fetchVerses(version, ref);
    if (!result) {
      return NextResponse.json(
        { error: "본문을 가져올 수 없습니다" },
        { status: 404 }
      );
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Bible API error:", error);
    return NextResponse.json(
      { error: "서버 오류", detail: String(error) },
      { status: 500 }
    );
  }
}
