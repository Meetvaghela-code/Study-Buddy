import { NextResponse } from 'next/server'
import { getCurrentUser, publicUser } from '@/lib/localDb'

export const runtime = 'nodejs'

function daysBetween(a: Date, b: Date) {
  return Math.floor((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86400000)
}

export async function GET() {
  const current = getCurrentUser()
  if (!current) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const activities = current.db.activities.filter((activity) => activity.user_id === current.user.id)
  const quizzes = activities.filter((activity) => activity.type === 'quiz_completed')
  const sessions = activities.filter((activity) => activity.type === 'study_session')
  const logins = activities.filter((activity) => activity.type === 'login')
  const registrations = activities.filter((activity) => activity.type === 'register')
  const scores = quizzes.map((activity) => activity.score).filter((score): score is number => typeof score === 'number')
  const avgScore = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
  const completed = scores.filter((score) => score >= 0.75).length
  const weakAreas = [...new Set(quizzes.flatMap((activity) => activity.weak_areas ?? []))].slice(0, 8)
  const topics = [...new Set(activities.map((activity) => activity.topic || activity.goal).filter(Boolean) as string[])]

  const activeDates = [...new Set(activities.map((activity) => activity.created_at.slice(0, 10)))].sort().reverse()
  let streak = 0
  const today = new Date()
  for (const date of activeDates) {
    const gap = daysBetween(today, new Date(`${date}T00:00:00.000Z`))
    if (gap === streak) streak += 1
    else if (gap > streak) break
  }

  return NextResponse.json({
    user: publicUser(current.user),
    stats: {
      total_activity: activities.length,
      logins: logins.length,
      registrations: registrations.length,
      sessions_started: sessions.length,
      quizzes_completed: quizzes.length,
      average_score: avgScore,
      completed,
      streak_days: streak,
      topics_count: topics.length,
    },
    topics: topics.slice(0, 6),
    weak_areas: weakAreas,
    recent_activity: activities.slice(0, 12),
  })
}
