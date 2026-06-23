import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { transcript } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not configured.")
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 })
    }

    if (!transcript || transcript.trim().length === 0) {
      return NextResponse.json({ error: 'Transcript is empty' }, { status: 400 })
    }

    const prompt = `You are a memory helper AI for a dementia patient's AR glasses system.
Analyze the following conversation transcript between a caregiver/visitor and the patient. Summarize the entire interaction into a single, concise memory point written from the patient's perspective (maximum 8 words, e.g., "Visiting with Shifa today", "Shifa brought delicious apple pie", "Shifa talked about our beach trip", "Playing chess with Shifa").
Also, extract the dominant emotion/feeling of the conversation (e.g., "Happy", "Warm", "Nostalgic", "Peaceful", "Excited").

Conversation Transcript:
"${transcript}"

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
      throw new Error(`Gemini API returned status code ${response.status}`)
    }

    const data = await response.json()
    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Clean up potential markdown formatting
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
    
    const parsed = JSON.parse(responseText)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Error in summarize-conversation:', error)
    const cleanText = (transcript || "").trim()
    const summaryWords = cleanText.split(/\s+/).slice(0, 5).join(" ")
    const summary = summaryWords ? `Spoke about: ${summaryWords}...` : "Visited with caregiver"
    return NextResponse.json({ summary, emotion: "Warm" })
  }
}
