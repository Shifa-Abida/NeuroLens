import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json()
    const transcript = typeof body === "object" && body !== null && "transcript" in body
      && typeof body.transcript === "string"
      ? body.transcript.trim()
      : ""
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured on the AR interface server." }, { status: 503 })
    }

    if (!transcript) {
      return NextResponse.json({ error: "Transcript is empty." }, { status: 400 })
    }
    if (transcript.length > 10000) {
      return NextResponse.json({ error: "Transcript is too long to summarize." }, { status: 413 })
    }

    const prompt = `You are a memory helper AI for a dementia patient's AR glasses system.
Analyze the following conversation transcript between the wearer and a recognized person. Summarize what they talked about into one concise, factual memory title (maximum 8 words). Do not invent details that are not in the transcript.
Also, extract the dominant emotion/feeling of the conversation (e.g., "Happy", "Warm", "Nostalgic", "Peaceful", "Excited").

Conversation Transcript:
<transcript>
${transcript}
</transcript>

Respond ONLY with a valid, clean JSON object. Do not include markdown code block syntax (like \`\`\`json). Output exactly this JSON structure and nothing else:
{
  "summary": "summarized_memory_point",
  "emotion": "extracted_emotion"
}`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        }),
      }
    )

    if (!response.ok) {
      console.error("Gemini conversation summary request failed:", response.status)
      return NextResponse.json({ error: "Gemini could not summarize this conversation." }, { status: 502 })
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text
      ?.replace(/```json/g, "").replace(/```/g, "").trim()
    if (!responseText) {
      return NextResponse.json({ error: "Gemini returned no conversation summary." }, { status: 502 })
    }

    const parsed: unknown = JSON.parse(responseText)
    if (
      typeof parsed !== "object" || parsed === null
      || !("summary" in parsed) || typeof parsed.summary !== "string" || !parsed.summary.trim()
      || !("emotion" in parsed) || typeof parsed.emotion !== "string" || !parsed.emotion.trim()
    ) {
      return NextResponse.json({ error: "Gemini returned an invalid conversation summary." }, { status: 502 })
    }

    return NextResponse.json({ summary: parsed.summary.trim(), emotion: parsed.emotion.trim() })
  } catch (error) {
    console.error("Error in summarize-conversation:", error)
    return NextResponse.json({ error: "Could not summarize the conversation." }, { status: 500 })
  }
}
