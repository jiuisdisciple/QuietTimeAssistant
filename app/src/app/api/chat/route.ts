import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { chatWithQnA } from "@/lib/ai";
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireApprovedUser();
    const date = request.nextUrl.searchParams.get("date");
    const sessionId = request.nextUrl.searchParams.get("session_id");

    if (sessionId) {
      // Verify session belongs to this user
      const owned = await sql`
        SELECT id FROM chat_sessions WHERE id = ${parseInt(sessionId)} AND user_id = ${user.id}
      `;
      if (owned.rows.length === 0) {
        return NextResponse.json([]);
      }

      const messages = await sql`
        SELECT id, role, content, created_at
        FROM chat_messages
        WHERE session_id = ${parseInt(sessionId)}
        ORDER BY created_at ASC
      `;
      return NextResponse.json(messages.rows);
    }

    if (date) {
      const sessions = await sql`
        SELECT
          s.id,
          s.title,
          s.created_at,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count
        FROM chat_sessions s
        WHERE s.user_id = ${user.id} AND s.date = ${date}
        ORDER BY s.created_at DESC
      `;
      return NextResponse.json(sessions.rows);
    }

    return NextResponse.json(
      { error: "date or session_id required" },
      { status: 400 }
    );
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error("Chat GET error:", error);
    return NextResponse.json(
      { error: "서버 오류", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApprovedUser();
    const body = await request.json();
    const {
      date,
      session_id,
      message,
      passage_reference,
    }: {
      date: string;
      session_id?: number;
      message: string;
      passage_reference: string;
    } = body;

    if (!date || !message) {
      return NextResponse.json(
        { error: "date and message required" },
        { status: 400 }
      );
    }

    let actualSessionId = session_id;
    if (actualSessionId) {
      // Verify ownership
      const owned = await sql`
        SELECT id FROM chat_sessions WHERE id = ${actualSessionId} AND user_id = ${user.id}
      `;
      if (owned.rows.length === 0) {
        actualSessionId = undefined;
      }
    }

    if (!actualSessionId) {
      const title = message.slice(0, 40);
      const result = await sql`
        INSERT INTO chat_sessions (user_id, date, title)
        VALUES (${user.id}, ${date}, ${title})
        RETURNING id
      `;
      actualSessionId = result.rows[0].id as number;
    }

    await sql`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES (${actualSessionId}, 'user', ${message})
    `;

    const history = await sql`
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ${actualSessionId}
      ORDER BY created_at ASC
    `;

    const aiResponse = await chatWithQnA(
      passage_reference || "(본문 정보 없음)",
      history.rows.map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content as string,
      }))
    );

    await sql`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES (${actualSessionId}, 'assistant', ${aiResponse})
    `;

    return NextResponse.json({
      session_id: actualSessionId,
      reply: aiResponse,
    });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error("Chat POST error:", error);
    return NextResponse.json(
      { error: "채팅 오류", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireApprovedUser();
    const sessionId = request.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "session_id required" }, { status: 400 });
    }

    await sql`
      DELETE FROM chat_sessions WHERE id = ${parseInt(sessionId)} AND user_id = ${user.id}
    `;
    return NextResponse.json({ deleted: sessionId });
  } catch (error) {
    const authErr = handleAuthError(error);
    if (authErr) return authErr;
    console.error("Chat DELETE error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
