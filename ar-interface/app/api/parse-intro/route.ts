import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY

    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not configured. Falling back to local Regex parser.")
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 })
    }

    const prompt = `You are a memory assistant AI. A caregiver or friend is introducing themselves to a dementia patient. 
Analyze the spoken transcript below and extract:
1. The introducing person's Name (e.g. "Shifa").
2. Their Relationship to the patient (e.g. "Friend", "Daughter", "Doctor", "Caregiver").

Spoken Transcript: "${text}"

Respond ONLY with a valid, clean JSON object. Do not include markdown code block syntax (like \`\`\`json). Output exactly this JSON structure and nothing else:
{
  "name": "extracted_name",
  "relationship": "extracted_relationship"
}
If a field cannot be determined from the transcript, return empty string "" for that field.`

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
    console.error('Error querying Gemini API:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
