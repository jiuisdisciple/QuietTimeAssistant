import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MODEL = "gpt-5";

export async function generateSummary(
  passageReference: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `당신은 성경 본문에 대한 간결한 개요를 제공하는 도우미입니다. 한국어로 답변하세요.
다음 형식으로 작성하세요:

## 역사적 배경
(2-3문장)

## 본문 맥락
(2-3문장)

## 핵심 메시지
(2-3문장)

## 자주 묻는 질문
(믿는 분들이 자주 질문하는 것 2-3개와 간단한 답변)`,
      },
      {
        role: "user",
        content: `오늘의 큐티 본문: ${passageReference}\n\n이 본문에 대한 개요를 작성해 주세요.`,
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
- 오직 사실 오류(성경의 인물, 장소, 사건 등)와 문법 오류만 체크하세요
- 격려의 말로 시작하세요

다음 형식으로 답변하세요:

## 총평
(한 줄 격려)

## 사실 확인
(오류가 있으면 구체적으로 지적, 없으면 "사실 오류가 발견되지 않았습니다 ✓")

## 문법 확인
(문법 오류가 있으면 번호를 매겨 지적, 없으면 "문법 오류가 발견되지 않았습니다 ✓")`,
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
