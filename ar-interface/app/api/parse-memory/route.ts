import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not configured. Falling back to local Regex parser.")
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 })
    }

    const prompt = `You are a memory extractor AI for an AR glasses system designed for dementia patients.
The patient's caregiver is talking to them. Analyze the caregiver's speech transcript and check if they are sharing, reminding, or referring to a specific memory, activity, shared experience, or personal fact (e.g., "we went to the beach yesterday", "remember when we got lost in London", "I brought your favorite apple pie", "we played chess this morning").

If the caregiver is referring to a shared memory or activity:
1. Summarize the memory into a very short, warm, and clear title (maximum 6 words, e.g. "Visiting the beach yesterday", "Getting lost in London", "Eating homemade apple pie", "Playing chess this morning").
2. Extract the emotion/sentiment of that memory (e.g. "Happy", "Warm", "Excited", "Nostalgic", "Peaceful").

Spoken Transcript: "${text}"

Respond ONLY with a valid, clean JSON object. Do not include markdown code block syntax (like \`\`\`json). Output exactly this JSON structure and nothing else:
{
  "hasMemory": true,
  "title": "extracted_memory_title",
  "emotion": "extracted_emotion"
}
If no clear memory or shared activity is found in the transcript, respond with:
{
  "hasMemory": false,
  "title": "",
  "emotion": ""
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
    
    // Clean up potential markdown formatting in generated text
    responseText = responseText.replace(/```json/g, "").replace(/```/g, "").trim()
    
    const parsed = JSON.parse(responseText)
    return NextResponse.json(parsed)
  } catch (error: any) {
    console.error('Error querying Gemini API for memory extraction:', error)
    return NextResponse.json({ hasMemory: false, title: "", emotion: "" })
  }
}
