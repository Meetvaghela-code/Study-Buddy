'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button, Card, Badge } from '@/components/ui/Button'
import {
  ArrowRight,
  Award,
  Activity,
  BookOpen,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { safePercent } from '@/lib/api'

type Activity = {
  id: string
  type: 'login' | 'register' | 'study_session' | 'quiz_completed'
  topic?: string
  goal?: string
  score?: number
  weak_areas?: string[]
  created_at: string
}

type Summary = {
  user: { id: string; name: string; email: string }
  stats: {
    total_activity: number
    logins: number
    registrations: number
    sessions_started: number
    quizzes_completed: number
    average_score: number
    completed: number
    streak_days: number
    topics_count: number
  }
  topics: string[]
  weak_areas: string[]
  recent_activity: Activity[]
}

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

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[]
  current_user_rank: number | null
  total_users: number
}

function activityLabel(activity: Activity) {
  if (activity.type === 'quiz_completed') return `Quiz completed: ${activity.topic ?? 'Untitled topic'}`
  if (activity.type === 'study_session') return `Study session started: ${activity.goal ?? activity.topic ?? 'New goal'}`
  if (activity.type === 'register') return 'Account created'
  return 'Signed in'
}

function leaderboardHonors(entry: LeaderboardEntry, entries: LeaderboardEntry[]) {
  if (!entries.length) return [] as string[]

  const maxActivityCount = Math.max(...entries.map((item) => item.activity_count))
  const maxAverageScore = Math.max(...entries.map((item) => item.average_quiz_score))

  const honors: string[] = []
  if (entry.rank === 1) honors.push('Top learner')
  if (entry.activity_count === maxActivityCount && maxActivityCount > 0) honors.push('Most active')
  if (entry.quiz_completed_count > 0 && entry.average_quiz_score === maxAverageScore && maxAverageScore > 0) honors.push('Best quiz average')
  return honors
}

export default function DashboardPage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadSummary = useCallback(async () => {
    setRefreshing(true)
    try {
      const [summaryResponse, leaderboardResponse] = await Promise.all([
        fetch('/api/activity/summary', { cache: 'no-store' }),
        fetch('/api/activity/leaderboard', { cache: 'no-store' }),
      ])

      if (summaryResponse.status === 401 || leaderboardResponse.status === 401) {
        router.push('/login')
        return
      }

      const [summaryData, leaderboardData] = await Promise.all([
        summaryResponse.json() as Promise<Summary>,
        leaderboardResponse.json() as Promise<LeaderboardResponse>,
      ])

      setSummary(summaryData)
      setLeaderboard(leaderboardData)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [router])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const stats = summary
    ? [
        { icon: <Activity size={22} />, label: 'Total activity', value: String(summary.stats.total_activity), color: 'from-emerald-500 to-teal-500' },
        { icon: <BookOpen size={22} />, label: 'Sessions', value: String(summary.stats.sessions_started), color: 'from-blue-500 to-cyan-500' },
        { icon: <Target size={22} />, label: 'Quizzes', value: String(summary.stats.quizzes_completed), color: 'from-accent to-green-500' },
        { icon: <CheckCircle2 size={22} />, label: 'Avg score', value: `${safePercent(summary.stats.average_score)}%`, color: 'from-purple-500 to-fuchsia-500' },
        { icon: <TrendingUp size={22} />, label: 'Streak', value: `${summary.stats.streak_days} day${summary.stats.streak_days === 1 ? '' : 's'}`, color: 'from-yellow-500 to-amber-500' },
      ]
    : []

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg via-dark-bg to-black px-4 py-24">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <Badge variant="info" className="mb-4 inline-flex items-center gap-2">
              <Zap size={14} />
              Personal dashboard
            </Badge>
            <h1 className="text-4xl font-bold text-white">
              {summary ? `Welcome back, ${summary.user.name}` : 'Loading your dashboard'}
            </h1>
            <p className="mt-2 text-text-secondary">
              Track every recorded action, review progress across the platform, and compare your rank with other learners.
            </p>
            {leaderboard?.current_user_rank ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white">
                <Trophy size={14} className="text-yellow-400" />
                Current rank: #{leaderboard.current_user_rank} of {leaderboard.total_users}
              </div>
            ) : null}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => void loadSummary()} disabled={refreshing}>
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button variant="ghost" onClick={() => void logout()}>
              <LogOut size={16} />
              Sign out
            </Button>
          </div>
        </motion.div>

        {loading ? (
          <Card hoverable={false}>
            <p className="text-text-secondary">Loading account activity...</p>
          </Card>
        ) : summary ? (
          <>
            <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-5">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Card className="!rounded-lg">
                    <div className={`mb-4 grid h-11 w-11 place-items-center rounded-lg bg-gradient-to-br ${stat.color} text-white`}>
                      {stat.icon}
                    </div>
                    <p className="text-sm text-text-secondary">{stat.label}</p>
                    <p className="mt-1 text-3xl font-bold text-white">{stat.value}</p>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card hoverable={false}>
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-white">Activity timeline</h2>
                    <p className="text-sm text-text-secondary">All recorded actions for your account.</p>
                  </div>
                  <Button href="/learn" variant="ghost" size="sm">
                    Start learning <ArrowRight size={15} />
                  </Button>
                </div>

                {summary.recent_activity.length ? (
                  <div className="space-y-3">
                    {summary.recent_activity.map((activity) => (
                      <div key={activity.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-medium text-white">{activityLabel(activity)}</p>
                            <p className="text-xs text-text-secondary">
                              {new Date(activity.created_at).toLocaleString()}
                            </p>
                          </div>
                          {typeof activity.score === 'number' ? (
                            <Badge variant={activity.score >= 0.75 ? 'success' : 'warning'}>
                              {safePercent(activity.score)}%
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-text-secondary">
                    No activity yet. Start a learning session to populate this dashboard.
                  </div>
                )}
              </Card>

              <div className="space-y-6">
                <Card hoverable={false}>
                  <div className="mb-4 flex items-center gap-3">
                    <Trophy className="text-accent" size={20} />
                    <h2 className="text-xl font-semibold text-white">Leaderboard</h2>
                  </div>
                  {leaderboard?.leaderboard?.length ? (
                    <div className="space-y-3">
                      {leaderboard.leaderboard.map((entry) => (
                        <div
                          key={entry.user.id}
                          className={`rounded-xl border p-4 ${
                            entry.is_current_user
                              ? 'border-accent/40 bg-accent/10'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-white/10 to-white/5 text-sm font-bold text-white">
                                #{entry.rank}
                              </div>
                              <div>
                                <p className="font-medium text-white">{entry.user.name}</p>
                                <p className="text-xs text-text-secondary">{entry.activity_count} activities</p>
                              </div>
                            </div>
                            <Badge variant={entry.is_current_user ? 'success' : 'default'}>
                              {entry.points} pts
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {leaderboardHonors(entry, leaderboard.leaderboard).map((honor) => (
                              <Badge key={honor} variant={honor === 'Top learner' ? 'success' : honor === 'Most active' ? 'info' : 'warning'}>
                                {honor}
                              </Badge>
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-text-secondary sm:grid-cols-4">
                            <span>Logins: {entry.login_count}</span>
                            <span>Sessions: {entry.study_session_count}</span>
                            <span>Quizzes: {entry.quiz_completed_count}</span>
                            <span>Score: {safePercent(entry.average_quiz_score)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Leaderboard will appear once there is more activity from multiple learners.</p>
                  )}
                </Card>

                <Card hoverable={false}>
                  <div className="mb-4 flex items-center gap-3">
                    <Award className="text-accent" size={20} />
                    <h2 className="text-xl font-semibold text-white">Topics touched</h2>
                  </div>
                  {summary.topics.length ? (
                    <div className="flex flex-wrap gap-2">
                      {summary.topics.map((topic) => (
                        <Badge key={topic} variant="default">{topic}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">Your studied topics will appear here.</p>
                  )}
                </Card>

                <Card hoverable={false}>
                  <div className="mb-4 flex items-center gap-3">
                    <Target className="text-accent" size={20} />
                    <h2 className="text-xl font-semibold text-white">Review areas</h2>
                  </div>
                  {summary.weak_areas.length ? (
                    <div className="space-y-2">
                      {summary.weak_areas.map((area) => (
                        <div key={area} className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                          {area}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-text-secondary">No weak areas recorded yet.</p>
                  )}
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
