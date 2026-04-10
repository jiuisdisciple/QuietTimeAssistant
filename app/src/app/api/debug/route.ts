import { NextRequest, NextResponse } from "next/server";
import { fetchTodayPassage } from "@/lib/scraper";
import OpenAI from "openai";

export async function GET(request: NextRequest) {
  const date =
    request.nextUrl.searchParams.get("date") ||
    new Date().toISOString().split("T")[0];

  const results: Record<string, unknown> = { date };

  // Test cdmb.link scraper
  try {
    const passage = await fetchTodayPassage(date);
    results.scraper = { ok: true, data: passage };
  } catch (e) {
    results.scraper = { ok: false, error: String(e) };
  }

  // Test OpenAI
  try {
    const hasKey = !!process.env.OPENAI_API_KEY;
    const keyPrefix = process.env.OPENAI_API_KEY?.substring(0, 7) || "none";
    results.openai_env = { hasKey, keyPrefix };

    if (hasKey) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: "Say 'hello' in Korean" }],
        max_completion_tokens: 2000,
        reasoning_effort: "minimal",
      });
      results.openai_test = {
        ok: true,
        response: response.choices[0]?.message?.content,
      };
    }
  } catch (e) {
    results.openai_test = { ok: false, error: String(e) };
  }

  // Test DB
  try {
    const { sql } = await import("@vercel/postgres");
    const result = await sql`SELECT NOW() as now`;
    results.db = { ok: true, now: result.rows[0]?.now };
  } catch (e) {
    results.db = { ok: false, error: String(e) };
  }

  return NextResponse.json(results);
}
