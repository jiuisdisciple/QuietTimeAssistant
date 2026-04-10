import { sql } from "@vercel/postgres";

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS passages (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      book_title TEXT NOT NULL,
      chapter_verse TEXT NOT NULL,
      full_reference TEXT NOT NULL,
      ai_summary TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS devotions (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      passage_reference TEXT,
      feedback_report TEXT,
      done_at TIMESTAMP,
      auto_saved_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  // QnA chat sessions grouped by devotion date
  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id SERIAL PRIMARY KEY,
      date DATE NOT NULL,
      title TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_date ON chat_sessions(date)
  `;
}

export { sql };
