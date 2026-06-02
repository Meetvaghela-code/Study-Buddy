import { NextResponse } from 'next/server'
import { getCurrentUser, publicUser } from '@/lib/localDb'

export const runtime = 'nodejs'

export async function GET() {
  const current = getCurrentUser()
  if (!current) {
    return NextResponse.json({ user: null }, { status: 401 })
  }
  return NextResponse.json({ user: publicUser(current.user) })
}
