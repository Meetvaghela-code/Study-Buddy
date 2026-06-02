import { NextResponse } from 'next/server'
import { getCurrentUser, publicUser } from '@/lib/localDb'

export const runtime = 'nodejs'

type LeaderboardEntry = {
  rank: number
  user: { id: string; name: string; email: string; created_at: string }
  points: number
  activity_count: number
  login_count: number
  registration_count: number
  study_session_count: number
  quiz_completed_count: number
  average_quiz_score: number
  last_active_at: string | null
  is_current_user: boolean
}

function activityPoints(type: string, score?: number) {
  if (type === 'register') return 8
  if (type === 'login') return 0
  if (type === 'study_session') return 6
  if (type === 'quiz_completed') return 14 + Math.round((typeof score === 'number' ? score : 0) * 10)
  return 0
}

export async function GET() {
  const current = getCurrentUser()
  if (!current) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }

  const grouped = new Map<string, LeaderboardEntry>()

  for (const user of current.db.users) {
    const userActivities = current.db.activities.filter((activity) => activity.user_id === user.id)
    const quizActivities = userActivities.filter((activity) => activity.type === 'quiz_completed')
    const quizScores = quizActivities.map((activity) => activity.score).filter((score): score is number => typeof score === 'number')
    const averageQuizScore = quizScores.length ? quizScores.reduce((sum, score) => sum + score, 0) / quizScores.length : 0

    const entry: LeaderboardEntry = {
      rank: 0,
      user: publicUser(user),
      points: userActivities.reduce((sum, activity) => sum + activityPoints(activity.type, activity.score), 0),
      activity_count: userActivities.length,
      login_count: userActivities.filter((activity) => activity.type === 'login').length,
      registration_count: userActivities.filter((activity) => activity.type === 'register').length,
      study_session_count: userActivities.filter((activity) => activity.type === 'study_session').length,
      quiz_completed_count: quizActivities.length,
      average_quiz_score: averageQuizScore,
      last_active_at: userActivities[0]?.created_at ?? null,
      is_current_user: user.id === current.user.id,
    }

    grouped.set(user.id, entry)
  }

  const leaderboard = [...grouped.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.activity_count !== a.activity_count) return b.activity_count - a.activity_count
    return (b.last_active_at ?? '').localeCompare(a.last_active_at ?? '')
  })

  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1
  })

  const currentUserRank = leaderboard.find((entry) => entry.is_current_user)?.rank ?? null

  return NextResponse.json({
    leaderboard: leaderboard.slice(0, 10),
    current_user_rank: currentUserRank,
    total_users: leaderboard.length,
  })
}