import { NextResponse } from 'next/server'
import { addActivity, createSession, publicUser, readDb, setSessionCookie, verifyPassword, writeDb } from '@/lib/localDb'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const db = readDb()
    const user = db.users.find((item) => item.email === email)

    if (!user || !verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const session = createSession(user.id)
    db.sessions = db.sessions.filter((item) => new Date(item.expires_at).getTime() > Date.now())
    db.sessions.push(session)
    addActivity(db, { user_id: user.id, type: 'login' })
    writeDb(db)
    setSessionCookie(session)

    return NextResponse.json({ user: publicUser(user) })
  } catch {
    return NextResponse.json({ error: 'Could not sign in.' }, { status: 500 })
  }
}
