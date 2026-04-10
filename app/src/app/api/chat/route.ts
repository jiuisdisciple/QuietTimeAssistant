import { NextRequest, NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { chatWithQnA } from "@/lib/ai";

// GET: fetch sessions for a date, or messages for a session
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");
  const sessionId = request.nextUrl.searchParams.get("session_id");

  try {
    if (sessionId) {
      // Fetch messages for a session
      const messages = await sql`
        SELECT id, role, content, created_at
        FROM chat_messages
        WHERE session_id = ${parseInt(sessionId)}
        ORDER BY created_at ASC
      `;
      return NextResponse.json(messages.rows);
    }

    if (date) {
      // Fetch sessions for a date
      const sessions = await sql`
        SELECT
          s.id,
          s.title,
          s.created_at,
          (SELECT COUNT(*) FROM chat_messages m WHERE m.session_id = s.id) as message_count
        FROM chat_sessions s
        WHERE s.date = ${date}
        ORDER BY s.created_at DESC
      `;
      return NextResponse.json(sessions.rows);
    }

    return NextResponse.json(
      { error: "date or session_id required" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Chat GET error:", error);
    return NextResponse.json(
      { error: "서버 오류", detail: String(error) },
      { status: 500 }
    );
  }
}

// POST: send a message (creates new session if session_id not provided)
export async function POST(request: NextRequest) {
  try {
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

    // Create session if not provided
    let actualSessionId = session_id;
    if (!actualSessionId) {
      const title = message.slice(0, 40);
      const result = await sql`
        INSERT INTO chat_sessions (date, title)
        VALUES (${date}, ${title})
        RETURNING id
      `;
      actualSessionId = result.rows[0].id as number;
    }

    // Save user message
    await sql`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES (${actualSessionId}, 'user', ${message})
    `;

    // Fetch full history for AI context
    const history = await sql`
      SELECT role, content
      FROM chat_messages
      WHERE session_id = ${actualSessionId}
      ORDER BY created_at ASC
    `;

    // Get AI response
    const aiResponse = await chatWithQnA(
      passage_reference || "(본문 정보 없음)",
      history.rows.map((r) => ({
        role: r.role as "user" | "assistant",
        content: r.content as string,
      }))
    );

    // Save AI message
    await sql`
      INSERT INTO chat_messages (session_id, role, content)
      VALUES (${actualSessionId}, 'assistant', ${aiResponse})
    `;

    return NextResponse.json({
      session_id: actualSessionId,
      reply: aiResponse,
    });
  } catch (error) {
    console.error("Chat POST error:", error);
    return NextResponse.json(
      { error: "채팅 오류", detail: String(error) },
      { status: 500 }
    );
  }
}

// DELETE: delete a session (and its messages via cascade)
export async function DELETE(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "session_id required" }, { status: 400 });
  }

  try {
    await sql`DELETE FROM chat_sessions WHERE id = ${parseInt(sessionId)}`;
    return NextResponse.json({ deleted: sessionId });
  } catch (error) {
    console.error("Chat DELETE error:", error);
    return NextResponse.json(
      { error: "삭제 실패", detail: String(error) },
      { status: 500 }
    );
  }
}
