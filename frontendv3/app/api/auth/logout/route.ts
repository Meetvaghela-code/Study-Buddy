import { NextResponse } from 'next/server'
import { clearSessionCookie, getCurrentUser, writeDb } from '@/lib/localDb'

export const runtime = 'nodejs'

export async function POST() {
  const current = getCurrentUser()
  if (current) {
    current.db.sessions = current.db.sessions.filter((session) => session.id !== current.session.id)
    writeDb(current.db)
  }
  clearSessionCookie()
  return NextResponse.json({ ok: true })
}
