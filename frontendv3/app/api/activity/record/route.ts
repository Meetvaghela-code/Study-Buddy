import { NextResponse } from 'next/server'
import { addActivity, getCurrentUser, writeDb } from '@/lib/localDb'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const current = getCurrentUser()
  if (!current) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const type = body.type === 'quiz_completed' ? 'quiz_completed' : 'study_session'
    const topic = typeof body.topic === 'string' ? body.topic : undefined
    const goal = typeof body.goal === 'string' ? body.goal : undefined
    const score = typeof body.score === 'number' ? body.score : undefined
    const weak_areas = Array.isArray(body.weak_areas)
      ? body.weak_areas.filter((item: unknown): item is string => typeof item === 'string')
      : undefined

    addActivity(current.db, {
      user_id: current.user.id,
      type,
      topic,
      goal,
      score,
      weak_areas,
    })
    writeDb(current.db)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not record activity.' }, { status: 500 })
  }
}
