import { cookies } from 'next/headers'
import { pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

export type User = {
  id: string
  name: string
  email: string
  password_hash: string
  created_at: string
}

export type Session = {
  id: string
  user_id: string
  created_at: string
  expires_at: string
}

export type Activity = {
  id: string
  user_id: string
  type: 'login' | 'register' | 'study_session' | 'quiz_completed'
  topic?: string
  goal?: string
  score?: number
  weak_areas?: string[]
  created_at: string
}

type LocalDb = {
  users: User[]
  sessions: Session[]
  activities: Activity[]
}

const DB_PATH = path.join(process.cwd(), 'data', 'local-auth-db.json')
const SESSION_COOKIE = 'studybuddy_session'
const SESSION_DAYS = 14

function emptyDb(): LocalDb {
  return { users: [], sessions: [], activities: [] }
}

export function readDb(): LocalDb {
  const dir = path.dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  if (!existsSync(DB_PATH)) {
    writeFileSync(DB_PATH, JSON.stringify(emptyDb(), null, 2))
    return emptyDb()
  }
  try {
    const parsed = JSON.parse(readFileSync(DB_PATH, 'utf8')) as Partial<LocalDb>
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      activities: Array.isArray(parsed.activities) ? parsed.activities : [],
    }
  } catch {
    return emptyDb()
  }
}

export function writeDb(db: LocalDb) {
  const dir = path.dirname(DB_PATH)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const actual = pbkdf2Sync(password, salt, 120000, 32, 'sha256')
  const expected = Buffer.from(hash, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function publicUser(user: User) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  }
}

export function createSession(userId: string) {
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)
  return {
    id: randomUUID(),
    user_id: userId,
    created_at: now.toISOString(),
    expires_at: expires.toISOString(),
  }
}

export function setSessionCookie(session: Session) {
  cookies().set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(session.expires_at),
  })
}

export function clearSessionCookie() {
  cookies().delete(SESSION_COOKIE)
}

export function getCurrentUser() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value
  if (!sessionId) return null
  const db = readDb()
  const session = db.sessions.find((item) => item.id === sessionId)
  if (!session || new Date(session.expires_at).getTime() < Date.now()) return null
  const user = db.users.find((item) => item.id === session.user_id)
  return user ? { db, user, session } : null
}

export function addActivity(db: LocalDb, activity: Omit<Activity, 'id' | 'created_at'>) {
  db.activities.unshift({
    id: randomUUID(),
    created_at: new Date().toISOString(),
    ...activity,
  })
}
