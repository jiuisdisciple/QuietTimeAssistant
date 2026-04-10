// Bible text fetcher using bolls.life API
// Supports KRV (개역한글) and ESV

// Map Korean book names → bolls.life numeric IDs
// Book IDs follow standard Protestant canon ordering (1=Genesis, ..., 66=Revelation)
const BOOK_NAME_TO_ID: Record<string, number> = {
  // Old Testament
  창세기: 1,
  출애굽기: 2,
  레위기: 3,
  민수기: 4,
  신명기: 5,
  여호수아: 6,
  사사기: 7,
  룻기: 8,
  사무엘상: 9,
  사무엘하: 10,
  열왕기상: 11,
  열왕기하: 12,
  역대상: 13,
  역대하: 14,
  에스라: 15,
  느헤미야: 16,
  에스더: 17,
  욥기: 18,
  시편: 19,
  잠언: 20,
  전도서: 21,
  아가: 22,
  이사야: 23,
  예레미야: 24,
  예레미야애가: 25,
  에스겔: 26,
  다니엘: 27,
  호세아: 28,
  요엘: 29,
  아모스: 30,
  오바댜: 31,
  요나: 32,
  미가: 33,
  나훔: 34,
  하박국: 35,
  스바냐: 36,
  학개: 37,
  스가랴: 38,
  말라기: 39,
  // New Testament
  마태복음: 40,
  마가복음: 41,
  누가복음: 42,
  요한복음: 43,
  사도행전: 44,
  로마서: 45,
  고린도전서: 46,
  고린도후서: 47,
  갈라디아서: 48,
  에베소서: 49,
  빌립보서: 50,
  골로새서: 51,
  데살로니가전서: 52,
  데살로니가후서: 53,
  디모데전서: 54,
  디모데후서: 55,
  디도서: 56,
  빌레몬서: 57,
  히브리서: 58,
  야고보서: 59,
  베드로전서: 60,
  베드로후서: 61,
  요한1서: 62,
  요한일서: 62,
  요한2서: 63,
  요한이서: 63,
  요한3서: 64,
  요한삼서: 64,
  유다서: 65,
  요한계시록: 66,
};

export interface Verse {
  verse: number;
  text: string;
}

export interface ParsedReference {
  book: number;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
}

// Parse "로마서 8:31-39" or "시편 73:1-28" or "창세기 1:1"
// Also handles no-space variants like "시편73:1-28" or abbreviations "시73:1-28"
export function parseReference(reference: string): ParsedReference | null {
  const trimmed = reference.trim();
  // Match: book name (letters) + optional space + chapter:verse[-endVerse]
  const match = trimmed.match(/^([^\d\s]+)\s*(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;

  const [, bookNameRaw, chapter, startVerse, endVerse] = match;
  const bookName = bookNameRaw.trim();
  // Try full name first, then abbreviation fallback
  const bookId =
    BOOK_NAME_TO_ID[bookName] || BOOK_NAME_TO_ID[BOOK_ABBR_FALLBACK[bookName] || ""];
  if (!bookId) return null;

  return {
    book: bookId,
    bookName,
    chapter: parseInt(chapter),
    startVerse: parseInt(startVerse),
    endVerse: endVerse ? parseInt(endVerse) : parseInt(startVerse),
  };
}

// Map abbreviations → full names (subset for fallback)
const BOOK_ABBR_FALLBACK: Record<string, string> = {
  창: "창세기", 출: "출애굽기", 레: "레위기", 민: "민수기", 신: "신명기",
  수: "여호수아", 삿: "사사기", 룻: "룻기",
  삼상: "사무엘상", 삼하: "사무엘하", 왕상: "열왕기상", 왕하: "열왕기하",
  대상: "역대상", 대하: "역대하", 스: "에스라", 느: "느헤미야", 에: "에스더",
  욥: "욥기", 시: "시편", 잠: "잠언", 전: "전도서", 아: "아가",
  사: "이사야", 렘: "예레미야", 애: "예레미야애가", 겔: "에스겔", 단: "다니엘",
  호: "호세아", 욜: "요엘", 암: "아모스", 옵: "오바댜", 욘: "요나",
  미: "미가", 나: "나훔", 합: "하박국", 습: "스바냐", 학: "학개",
  슥: "스가랴", 말: "말라기",
  마: "마태복음", 막: "마가복음", 눅: "누가복음", 요: "요한복음",
  행: "사도행전",
  롬: "로마서", 고전: "고린도전서", 고후: "고린도후서", 갈: "갈라디아서",
  엡: "에베소서", 빌: "빌립보서", 골: "골로새서",
  살전: "데살로니가전서", 살후: "데살로니가후서",
  딤전: "디모데전서", 딤후: "디모데후서", 딛: "디도서", 몬: "빌레몬서",
  히: "히브리서", 약: "야고보서",
  벧전: "베드로전서", 벧후: "베드로후서",
  요일: "요한일서", 요이: "요한이서", 요삼: "요한삼서",
  유: "유다서", 계: "요한계시록",
};

// Strip HTML tags from text (bolls returns text with <br/>, <S> tags etc.)
function cleanText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<S>\d+<\/S>/gi, "")
    .replace(/<i>|<\/i>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch a specific verse range from bolls.life
export async function fetchVerses(
  translation: "KRV" | "ESV",
  reference: string
): Promise<{ reference: string; verses: Verse[] } | null> {
  const parsed = parseReference(reference);
  if (!parsed) {
    console.error("Failed to parse reference:", reference);
    return null;
  }

  const url = `https://bolls.life/get-text/${translation}/${parsed.book}/${parsed.chapter}/`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error("Bolls API error:", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as Array<{
      pk?: number;
      verse: number;
      text: string;
    }>;

    // Filter to verse range
    const verses = data
      .filter(
        (v) => v.verse >= parsed.startVerse && v.verse <= parsed.endVerse
      )
      .map((v) => ({
        verse: v.verse,
        text: cleanText(v.text),
      }));

    return {
      reference,
      verses,
    };
  } catch (error) {
    console.error("Failed to fetch verses:", error);
    return null;
  }
}
