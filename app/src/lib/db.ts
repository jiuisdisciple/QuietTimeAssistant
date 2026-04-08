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
}

export { sql };
