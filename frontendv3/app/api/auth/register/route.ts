import { NextResponse } from 'next/server'
import { addActivity, hashPassword, publicUser, readDb, writeDb } from '@/lib/localDb'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (name.length < 2) {
      return NextResponse.json({ error: 'Enter your name.' }, { status: 400 })
    }
    if (!email.includes('@')) {
      return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 })
    }

    const db = readDb()
    if (db.users.some((user) => user.email === email)) {
      return NextResponse.json({ error: 'An account already exists for this email.' }, { status: 409 })
    }

    const user = {
      id: crypto.randomUUID(),
      name,
      email,
      password_hash: hashPassword(password),
      created_at: new Date().toISOString(),
    }
    db.users.push(user)
    addActivity(db, { user_id: user.id, type: 'register' })
    writeDb(db)

    return NextResponse.json({ user: publicUser(user) })
  } catch {
    return NextResponse.json({ error: 'Could not create account.' }, { status: 500 })
  }
}
