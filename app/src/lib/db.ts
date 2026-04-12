import { sql } from "@vercel/postgres";

export async function initDB() {
  // Users table with Clerk integration + approval workflow
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      clerk_id TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      name TEXT NOT NULL,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      is_admin BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      approved_at TIMESTAMP
    )
  `;

  // Shared data: Bible passages + AI summaries (no user_id — shared across all)
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

  // Personal data: devotions (per-user)
  await sql`
    CREATE TABLE IF NOT EXISTS devotions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      content TEXT DEFAULT '',
      passage_reference TEXT,
      feedback_report TEXT,
      done_at TIMESTAMP,
      auto_saved_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (user_id, date)
    )
  `;

  // Migration: add user_id if it doesn't exist (for existing deployments)
  await sql`
    ALTER TABLE devotions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
  `;

  // Migration: ensure unique constraint exists for ON CONFLICT to work
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_devotions_user_id_date_key ON devotions(user_id, date)
  `;

  // Personal data: chat sessions (per-user)
  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      title TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
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
    CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_date ON chat_sessions(user_id, date)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_devotions_user_date ON devotions(user_id, date)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id)
  `;
}

export { sql };
