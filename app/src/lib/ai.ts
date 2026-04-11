import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-5";
const NANO_MODEL = "gpt-4.1-nano";

// Normalize free-form Korean/English Bible references into the canonical
// "풀책이름 장:시작절-끝절" format that our parseReference + bolls.life
// pipeline understands. Returns null if normalization fails — callers
// should fall back to the raw input.
export async function normalizeReference(
  userInput: string
): Promise<string | null> {
  const system = `You convert free-form Korean/English Bible references into a canonical format for a verse lookup API.

Canonical format: "<한국어 풀 책이름> <장번호>:<시작절>-<끝절>"

Full Korean book names (use exactly these):
창세기, 출애굽기, 레위기, 민수기, 신명기, 여호수아, 사사기, 룻기, 사무엘상, 사무엘하, 열왕기상, 열왕기하, 역대상, 역대하, 에스라, 느헤미야, 에스더, 욥기, 시편, 잠언, 전도서, 아가, 이사야, 예레미야, 예레미야애가, 에스겔, 다니엘, 호세아, 요엘, 아모스, 오바댜, 요나, 미가, 나훔, 하박국, 스바냐, 학개, 스가랴, 말라기, 마태복음, 마가복음, 누가복음, 요한복음, 사도행전, 로마서, 고린도전서, 고린도후서, 갈라디아서, 에베소서, 빌립보서, 골로새서, 데살로니가전서, 데살로니가후서, 디모데전서, 디모데후서, 디도서, 빌레몬서, 히브리서, 야고보서, 베드로전서, 베드로후서, 요한일서, 요한이서, 요한삼서, 유다서, 요한계시록

Rules:
- Always use the FULL Korean book name. Expand abbreviations (빌 → 빌립보서, 시 → 시편, 롬 → 로마서, etc.) and translate English names (Phil → 빌립보서).
- If no verse is specified (e.g. "1장" or "3"), output "1:1-999" to mean the whole chapter (999 is a sentinel).
- If only a single verse is specified (e.g. "3:16"), output "3:16-16".
- Output EXACTLY the canonical string — no quotes, no explanation, no trailing punctuation.
- If the input is unrecognizable as a Bible reference, output the literal string: INVALID

Examples:
Input: 빌립보서 1장
Output: 빌립보서 1:1-999

Input: 빌 1:1-10
Output: 빌립보서 1:1-10

Input: 시 73:1-28
Output: 시편 73:1-28

Input: 요 3:16
Output: 요한복음 3:16-16

Input: 로마서 8장 31-39절
Output: 로마서 8:31-39

Input: Phil 2
Output: 빌립보서 2:1-999

Input: hello world
Output: INVALID`;

  try {
    const response = await openai.chat.completions.create({
      model: NANO_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userInput },
      ],
      max_tokens: 60,
      temperature: 0,
    });
    const raw = response.choices[0]?.message?.content?.trim() || "";
    if (!raw || raw === "INVALID") return null;
    return raw;
  } catch (e) {
    console.error("normalizeReference failed:", e);
    return null;
  }
}

export async function generateSummary(
  passageReference: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `당신은 깊이 있는 성경 해설을 제공하는 도우미입니다. 한국어로, 독자가 본문을 더 풍부하게 이해할 수 있도록 돕는 것이 목표입니다.

작성 원칙:
- 구체적이고 밀도 있게 쓰세요 — 뻔한 말은 피하세요
- 원어(히브리어/헬라어) 뉘앙스, 저자의 의도, 문화적 맥락을 활용하세요
- 신학적으로 균형 잡힌 개신교 복음주의 관점을 유지하세요
- 각 섹션은 2-4문장, 서로 내용이 겹치지 않게 하세요

다음 형식으로 작성하세요:

## 배경 & 문맥
(언제·누구에게·왜 쓰였는지. 앞뒤 문맥에서 이 본문이 차지하는 위치)

## 핵심 메시지
(본문이 말하고자 하는 중심 사상 — 구체적으로)

## 흥미로운 점
(원어의 뉘앙스, 역사적/문화적 디테일, 쉽게 지나치는 관찰 등 독자를 "아하" 하게 만드는 통찰 1-3가지)

## 자주 묻는 질문
(이 본문을 읽을 때 실제로 떠오를 법한 질문 2개와 간결한 답변)`,
      },
      {
        role: "user",
        content: `본문: ${passageReference}\n\n위 본문에 대한 해설을 위 형식으로 작성해 주세요.`,
      },
    ],
    max_completion_tokens: 8000,
    reasoning_effort: "minimal",
  });

  return response.choices[0]?.message?.content || "요약을 생성할 수 없습니다.";
}

export async function checkDevotion(
  passageReference: string,
  devotionContent: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `당신은 큐티(Quiet Time) 내용을 검토하는 도우미입니다. 한국어로 답변하세요.

중요한 규칙:
- 큐티 내용에 대한 영적/신앙적 판단은 절대 하지 마세요
- 사실 오류: 성경의 인물, 장소, 사건, 교리 등의 명백한 오류만 지적
- 문법 오류: 사소한 것은 무시하고, **critical/심각한 문법 오류만** 지적 (맥락 이해에 지장을 주는 수준)
- 격려의 말로 시작하세요

다음 형식으로 답변하세요:

## 총평
(한 줄 격려)

## 사실 확인
(명백한 오류가 있으면 구체적으로 지적, 없으면 정확히 "사실 오류가 발견되지 않았습니다 ✓")

## 문법 확인
(심각한 문법 오류가 있으면 번호를 매겨 지적, 없으면 정확히 "큰 문법적 오류는 발견되지 않았습니다 ✓")`,
      },
      {
        role: "user",
        content: `본문: ${passageReference}\n\n큐티 내용:\n${devotionContent}`,
      },
    ],
    max_completion_tokens: 6000,
    reasoning_effort: "minimal",
  });

  return response.choices[0]?.message?.content || "검토를 수행할 수 없습니다.";
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithQnA(
  passageReference: string,
  history: ChatMessage[]
): Promise<string> {
  const systemPrompt = `당신은 개혁신학적 관점에서 성경 본문에 대한 질문에 친근하게 답하는 도우미입니다.

원칙:
- 성경 본문에 근거해 답하고, 필요한 경우 관련 구절을 언급하세요
- 확실하지 않은 것은 확실하지 않다고 말하세요
- 영적 판단이나 정죄는 피하고, 지식·해석에 집중하세요
- 부드럽고 대화체로 답변하세요
- 한국어로 답변하세요

현재 큐티 본문: ${passageReference}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_completion_tokens: 4000,
    reasoning_effort: "minimal",
  });

  return response.choices[0]?.message?.content || "답변을 생성할 수 없습니다.";
}
