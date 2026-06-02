import { NextResponse } from 'next/server'

const studyBuddyUrl = (process.env.STUDY_BUDDY_URL ?? 'http://localhost:9002').replace(/\/$/, '')

function parseA2AResult(data: any) {
  const result = data?.result ?? data
  const messageText = result?.parts?.find?.(
    (part: any) => (part?.type === 'text' || part?.kind === 'text') && typeof part.text === 'string',
  )?.text
  if (typeof messageText === 'string') {
    try {
      return JSON.parse(messageText)
    } catch {
      return { text: messageText }
    }
  }
  return result
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const topic = typeof body.topic === 'string' ? body.topic : 'General Topic'
    const explanation = typeof body.explanation === 'string' ? body.explanation : ''
    const weakAreas = Array.isArray(body.weak_areas)
      ? body.weak_areas.filter((item: unknown): item is string => typeof item === 'string')
      : []

    const response = await fetch(`${studyBuddyUrl}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'message/send',
        params: {
          id: crypto.randomUUID(),
          message: {
            messageId: crypto.randomUUID(),
            role: 'user',
            parts: [{ type: 'text', text: JSON.stringify({ topic, explanation, weak_areas: weakAreas }) }],
          },
        },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || `Study buddy request failed: ${response.status}`)
    }

    const raw = await response.json()
    const result = parseA2AResult(raw)

    if (result?.error || result?.status === 'error') {
      return NextResponse.json(
        {
          source: 'fallback',
          topic,
          weak_areas: weakAreas,
          status: 'complete',
          assistance: [
            `Try rephrasing ${topic} in simpler terms first.`,
            weakAreas.length
              ? `Focus on: ${weakAreas.join(', ')}.`
              : 'Identify the main concept, then test it with one concrete example.',
            'A good check is to explain it aloud in one minute without looking at notes.',
          ].join(' '),
        },
        { status: 200 },
      )
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to contact study buddy'
    return NextResponse.json(
      {
        source: 'fallback',
        status: 'complete',
        assistance: 'The study coach is unavailable right now. Please try again in a moment.',
        warning: message,
      },
      { status: 200 },
    )
  }
}