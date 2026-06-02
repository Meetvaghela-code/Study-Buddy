'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Target,
  CheckCircle2,
  ArrowRight,
  Loader2,
  AlertCircle,
  RotateCcw,
  Download,
  Clock,
  Brain,
} from 'lucide-react'
import { Button, Card, Badge } from '@/components/ui/Button'
import { TextArea } from '@/components/ui/Input'
import { MarkdownContent } from '@/components/MarkdownContent'
import type {
  Screen,
  LearnerMode,
  StudyRoadmap,
  Topic,
  QuizQuestion,
  GradedQuestion,
  QuizResult,
} from '@/lib/types'
import { SCREEN_LABELS, GOAL_PRESETS } from '@/lib/types'
import { computeAverage, safePercent } from '@/lib/api'

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

async function apiPost<T>(path: string, body: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function recordActivity(body: Record<string, unknown>) {
  try {
    await fetch('/api/activity/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Activity tracking should never block the learning flow.
  }
}

// ─── Sub-components ───────────────────────────────────────────

function MetricRow({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
        >
          <span className="block text-xs font-bold uppercase tracking-wider text-text-secondary">
            {item.label}
          </span>
          <strong className="block mt-1 text-xl text-white">{item.value}</strong>
        </div>
      ))}
    </div>
  )
}

function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm mb-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <span className="inline-grid w-8 h-8 place-items-center rounded-full bg-accent/20 text-accent font-bold text-sm">
            {index}
          </span>
          <strong className="text-white">{topic.title}</strong>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-text-secondary">
          <Clock size={12} />
          {topic.estimated_minutes} min
        </span>
      </div>
      <p className="text-sm text-text-secondary">{topic.description}</p>
      {topic.prerequisites.length > 0 && (
        <span className="inline-flex mt-2 rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-text-secondary">
          Prereqs: {topic.prerequisites.join(', ')}
        </span>
      )}
    </div>
  )
}

function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-text-secondary">{label}</span>
        <span className="text-accent font-bold">{Math.round(value * 100)}%</span>
      </div>
      <div className="w-full rounded-full h-2 bg-white/10">
        <motion.div
          className="h-2 rounded-full bg-gradient-to-r from-accent to-green-500"
          initial={{ width: 0 }}
          animate={{ width: `${value * 100}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </div>
  )
}

function compactReviewText(text: string, limit = 180) {
  const cleaned = text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\s+#{2,}\s+/g, '. ')
    .replace(/\s+-\s+/g, '. ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned) return text
  const firstSentence = cleaned.split(/(?<=\.)\s+/)[0] || cleaned
  const candidate = firstSentence.length < limit ? firstSentence : cleaned
  return candidate.length > limit ? `${candidate.slice(0, limit - 3).trim()}...` : candidate
}

function formatExpectedAnswer(text: string) {
  return text
    .replace(/\s+###\s+/g, '\n\n### ')
    .replace(/\s+-\s+\*\*/g, '\n- **')
    .replace(/```(\w+)?\s+/g, '```$1\n')
    .replace(/\s+```/g, '\n```')
    .trim()
}

// ─── Main Page ─────────────────────────────────────────────────

export default function LearnPage() {
  const abortRef = useRef<AbortController | null>(null)

  // Cancel in-flight requests on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function getSignal(): AbortSignal {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    return ctrl.signal
  }

  const [screen, setScreen] = useState<Screen>('GOAL_INPUT')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [goal, setGoal] = useState('')
  const [learnerMode, setLearnerMode] = useState<LearnerMode>('Balanced')
  const [roadmap, setRoadmap] = useState<StudyRoadmap | null>(null)

  // Topic state
  const [currentTopicIndex, setCurrentTopicIndex] = useState(0)
  const [topicTitle, setTopicTitle] = useState('')
  const [topicDescription, setTopicDescription] = useState('')
  const [explanation, setExplanation] = useState('')
  const [coachingMessage, setCoachingMessage] = useState('')

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [gradedAnswers, setGradedAnswers] = useState<GradedQuestion[]>([])
  const [missingConcepts, setMissingConcepts] = useState<string[]>([])
  const [confidenceLog, setConfidenceLog] = useState<number[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [weakAreas, setWeakAreas] = useState<string[]>([])

  // Current question answer state
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [currentSelectedOptions, setCurrentSelectedOptions] = useState<string[]>([])
  const [currentConfidence, setCurrentConfidence] = useState(3)

  const totalTopics = roadmap?.topics.length ?? 0
  const overallAvg = quizResults.length
    ? quizResults.reduce((s, r) => s + r.score, 0) / quizResults.length
    : 0

  const totalMinutes = roadmap
    ? roadmap.topics.reduce((s, t) => s + (t.estimated_minutes || 0), 0)
    : 0

  const buildBrief = useCallback(() => {
    const lines = [
      '# Learning Accelerator Brief',
      '',
      `Session: ${sessionId ?? 'not started'}`,
      `Goal: ${goal || roadmap?.goal || 'not set'}`,
      `Learner mode: ${learnerMode}`,
      '',
    ]
    if (roadmap) {
      lines.push('## Roadmap', '')
      roadmap.topics.forEach((t, i) => {
        lines.push(`${i + 1}. ${t.title} (${t.estimated_minutes} min)`)
        lines.push(`   - ${t.description}`)
      })
      lines.push('')
    }
    if (quizResults.length) {
      lines.push('## Quiz Results', '')
      quizResults.forEach((r) => {
        const weak = r.weak_areas.length ? r.weak_areas.join(', ') : 'none'
        lines.push(`- ${r.topic}: ${safePercent(r.score)}% | Review: ${weak}`)
      })
      lines.push('')
    }
    if (weakAreas.length) {
      lines.push('## Topics To Revisit', '')
      weakAreas.forEach((w) => lines.push(`- ${w}`))
      lines.push('')
    }
    if (coachingMessage) {
      lines.push('## Latest Coach Note', '', coachingMessage, '')
    }
    return lines.join('\n')
  }, [sessionId, goal, roadmap, learnerMode, quizResults, weakAreas, coachingMessage])

  const downloadBrief = () => {
    const blob = new Blob([buildBrief()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `learning-brief-${sessionId ?? 'session'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Actions ──────────────────────────────────────────────────

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!goal.trim()) {
      setError('Enter a learning goal to start.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const data = await apiPost<{
        session_id: string
        interrupt: boolean
        payload?: { roadmap: StudyRoadmap; message?: string }
      }>('/api/session/start', { goal: goal.trim() }, getSignal())

      setSessionId(data.session_id)
      void recordActivity({
        type: 'study_session',
        goal: goal.trim(),
      })

      if (data.interrupt && data.payload?.roadmap) {
        setRoadmap(data.payload.roadmap)
        setScreen('ROADMAP_APPROVAL')
      } else {
        setError('The planner finished without returning a roadmap.')
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to start session')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approved: boolean) => {
    if (!sessionId) return
    setError('')
    setLoading(true)
    try {
      const data = await apiPost<{
        interrupt: boolean
        payload?: { roadmap: StudyRoadmap; message?: string }
        roadmap?: StudyRoadmap | null
        current_topic_index: number
        topic_title: string
        topic_description: string
        explanation: string
        quiz_questions: QuizQuestion[]
      }>('/api/session/approve', {
        session_id: sessionId,
        decision: approved ? 'yes' : 'no',
      }, getSignal())

      if (data.interrupt && data.payload?.roadmap) {
        setRoadmap(data.payload.roadmap)
        setScreen('ROADMAP_APPROVAL')
        return
      }

      const newRoadmap = data.roadmap || roadmap
      setRoadmap(newRoadmap as StudyRoadmap | null)
      setCurrentTopicIndex(data.current_topic_index ?? 0)
      setTopicTitle(data.topic_title ?? '')
      setTopicDescription(data.topic_description ?? '')
      setExplanation(data.explanation ?? '')
      setQuizQuestions(data.quiz_questions ?? [])
      setCurrentQuestionIdx(0)
      setGradedAnswers([])
      setMissingConcepts([])
      setConfidenceLog([])
      setCurrentAnswer('')
      setCurrentSelectedOptions([])
      setScreen('EXPLAINING')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to process approval')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault()
    const q = quizQuestions[currentQuestionIdx]
    if (!q) return

    const hasOptions = Boolean(q.options?.length)
    const userAnswer = hasOptions
      ? currentSelectedOptions.join(', ') || '(no option selected)'
      : currentAnswer.trim() || '(no answer provided)'
    setLoading(true)
    try {
      const grade = await apiPost<{
        correct: boolean
        feedback: string
        score: number
        missing_concept?: string
      }>('/api/quiz/grade', {
        question: q.question,
        expected_answer: q.expected_answer || '',
        options: q.options ?? [],
        correct_option_ids: q.correct_option_ids ?? [],
        selected_option_ids: currentSelectedOptions,
        student_answer: userAnswer,
      }, getSignal())

      const graded: GradedQuestion = {
        question: q.question,
        expected_answer: q.expected_answer || '',
        options: q.options ?? [],
        correct_option_ids: q.correct_option_ids ?? [],
        selected_option_ids: currentSelectedOptions,
        user_answer: userAnswer,
        correct: Boolean(grade.correct),
        feedback: grade.feedback ?? '',
        score: typeof grade.score === 'number' ? grade.score : 0,
      }

      setGradedAnswers((prev) => [...prev, graded])
      setConfidenceLog((prev) => [...prev, currentConfidence])

      if (grade.missing_concept?.trim()) {
        setMissingConcepts((prev) => [...prev, grade.missing_concept!.trim()])
      }

      setCurrentQuestionIdx((prev) => prev + 1)
      setCurrentAnswer('')
      setCurrentSelectedOptions([])
      setCurrentConfidence(3)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to grade answer')
    } finally {
      setLoading(false)
    }
  }

  const handleAdvanceAfterQuiz = async () => {
    if (!sessionId || !roadmap) return

    const avgScore = computeAverage(gradedAnswers)
    const uniqueWeak = [...new Set(missingConcepts)]

    const quizResult: QuizResult = {
      topic: topicTitle,
      questions: gradedAnswers,
      score: avgScore,
      weak_areas: uniqueWeak,
    }

    const newQuizResults = [...quizResults, quizResult]
    const newWeakAreas = [...new Set([...weakAreas, ...uniqueWeak])]

    setQuizResults(newQuizResults)
    setWeakAreas(newWeakAreas)
    void recordActivity({
      type: 'quiz_completed',
      topic: topicTitle,
      goal: goal || roadmap.goal,
      score: avgScore,
      weak_areas: uniqueWeak,
    })

    setLoading(true)
    try {
      const signal = getSignal()
      const data = await apiPost<{
        coaching_message: string
        quiz_results: QuizResult[]
        weak_areas: string[]
        current_topic_index: number
        roadmap: StudyRoadmap | null
        complete: boolean
        topic_title: string
        topic_description: string
        explanation: string
        quiz_questions: QuizQuestion[]
      }>('/api/quiz/advance', {
        session_id: sessionId,
        quiz_result: {
          ...quizResult,
          quiz_results: newQuizResults,
          weak_areas: newWeakAreas,
          roadmap,
          current_topic_index: currentTopicIndex,
        },
      }, signal)

      setCoachingMessage(data.coaching_message ?? '')
      setQuizResults(data.quiz_results ?? newQuizResults)
      setWeakAreas(data.weak_areas ?? newWeakAreas)

      const newIdx = data.current_topic_index ?? currentTopicIndex + 1
      setCurrentTopicIndex(newIdx)
      setRoadmap((data.roadmap as StudyRoadmap | null) ?? roadmap)

      if (data.complete || (data.roadmap && newIdx >= data.roadmap.topics.length)) {
        setScreen('COMPLETE')
        return
      }

      // Use backend-provided next topic payload to avoid state drift.
      setTopicTitle(data.topic_title ?? '')
      setTopicDescription(data.topic_description ?? '')
      setExplanation(data.explanation ?? '')
      setQuizQuestions(data.quiz_questions ?? [])

      setCurrentQuestionIdx(0)
      setGradedAnswers([])
      setMissingConcepts([])
      setConfidenceLog([])
      setCurrentSelectedOptions([])
      setCoachingMessage('')
      setScreen('EXPLAINING')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to advance')
    } finally {
      setLoading(false)
    }
  }

  // ── Render screens ───────────────────────────────────────────

  const renderGoalInput = () => (
    <div>
      <div className="text-center max-w-3xl mx-auto mb-12">
        <Badge variant="info" className="mb-4 inline-flex items-center gap-2">
          <Sparkles size={14} />
          Local multi-agent learning system
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Learning Accelerator
        </h1>
        <p className="text-text-secondary text-lg leading-relaxed max-w-2xl mx-auto">
          Turn your notes into a guided study session with planning, explanations,
          quizzes, checkpointing, and adaptive coaching.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
        <div className="lg:col-span-2">
          <Card className="!hover:-translate-y-0">
            <h2 className="text-xl font-semibold text-white mb-2">Create a session</h2>
            <p className="text-sm text-text-secondary mb-6">
              Choose a goal, pick a pace, and let the agents build the first roadmap.
            </p>

            <form onSubmit={handleStartSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Quick goals
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                  onChange={(e) => {
                    if (e.target.value) setGoal(e.target.value)
                  }}
                  defaultValue=""
                >
                  <option value="" disabled style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                    Custom goal
                  </option>
                  {GOAL_PRESETS.map((g) => (
                    <option key={g} value={g} style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              <TextArea
                label="Learning goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Example: Learn Python closures and decorators from scratch"
                rows={3}
              />

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Pace
                </label>
                <div className="flex gap-2">
                  {(['Balanced', 'Deep focus', 'Exam sprint'] as LearnerMode[]).map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setLearnerMode(mode)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          learnerMode === mode
                            ? 'bg-accent text-white'
                            : 'bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10'
                        }`}
                      >
                        {mode}
                      </button>
                    )
                  )}
                </div>
              </div>

              <Button type="submit" variant="primary" fullWidth disabled={loading}>
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Target size={16} />
                )}
                Build study plan
              </Button>
            </form>
          </Card>
        </div>

        <Card className="!bg-white/5 !border-white/10 !hover:-translate-y-0">
          <h3 className="text-lg font-semibold text-white mb-3">What gets built</h3>
          <p className="text-sm text-text-secondary mb-4">
            Planner, explainer, quiz generator, coach, checkpoints, and a session
            brief.
          </p>
          <p className="text-sm text-text-secondary">
            The experience runs locally and keeps the human approval step in the
            loop.
          </p>
        </Card>
      </div>
    </div>
  )

  const renderRoadmapApproval = () => (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Roadmap approval
        </span>
        <h1 className="text-3xl font-bold text-white mt-2">Your study plan is ready</h1>
        {roadmap && <p className="text-text-secondary mt-1">{roadmap.goal}</p>}
      </div>

      {roadmap && (
        <MetricRow
          items={[
            { label: 'Topics', value: String(roadmap.topics.length) },
            { label: 'Study time', value: `${totalMinutes} min` },
            { label: 'Mode', value: learnerMode },
            { label: 'Session', value: sessionId ?? '-' },
          ]}
        />
      )}

      {roadmap?.topics.map((topic, i) => (
        <TopicCard key={i} topic={topic} index={i + 1} />
      ))}

      <div className="flex flex-wrap gap-3 mt-6">
        <Button variant="primary" onClick={() => handleApprove(true)} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
          Start studying
        </Button>
        <Button variant="outline" onClick={() => handleApprove(false)} disabled={loading}>
          <RotateCcw size={16} />
          Regenerate plan
        </Button>
        <Button variant="ghost" onClick={downloadBrief}>
          <Download size={16} />
          Download roadmap brief
        </Button>
      </div>
    </div>
  )

  const renderExplaining = () => (
    <div className="max-w-5xl mx-auto">
      <ProgressBar
        value={totalTopics ? currentTopicIndex / totalTopics : 0}
        label={`Topic ${currentTopicIndex + 1} of ${totalTopics}`}
      />

      <MetricRow
        items={[
          { label: 'Topics', value: `${currentTopicIndex}/${totalTopics}` },
          { label: 'Avg score', value: quizResults.length ? `${safePercent(overallAvg)}%` : '-' },
          { label: 'Study time', value: `${totalMinutes} min` },
          { label: 'Mode', value: learnerMode },
        ]}
      />

      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        Learning module
      </span>
      <h1 className="text-3xl font-bold text-white mt-2">{topicTitle}</h1>
      <p className="text-text-secondary mb-4">{topicDescription}</p>

      {coachingMessage && (
        <div className="border-l-4 border-accent bg-accent/10 rounded-lg p-4 mb-6">
          <strong className="text-white">Coach note</strong>
          <p className="text-text-secondary text-sm mt-1">{coachingMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 !hover:-translate-y-0">
          <h2 className="text-xl font-semibold text-white mb-4">Explanation</h2>
          {explanation ? (
            <MarkdownContent content={explanation} />
          ) : (
            <p className="text-yellow-400 text-sm">
              No explanation was returned, so the quiz will use topic context.
            </p>
          )}
        </Card>

        <Card className="!bg-white/5 !border-white/10 !hover:-translate-y-0">
          <h3 className="text-lg font-semibold text-white mb-3">Focus card</h3>
          <p className="text-sm text-text-secondary mb-1">
            <strong className="text-white">Topic:</strong> {topicTitle}
          </p>
          <p className="text-sm text-text-secondary mb-3">
            <strong className="text-white">Pace:</strong> {learnerMode}
          </p>
          <p className="text-sm text-text-secondary mb-4">
            Read once for structure, then answer from memory.
          </p>
          <Button
            variant="primary"
            fullWidth
            onClick={() => {
              setCoachingMessage('')
              setScreen('QUIZZING')
            }}
          >
            <Brain size={16} />
            Start quiz
          </Button>
        </Card>
      </div>
    </div>
  )

  const renderQuizzing = () => {
    const totalQ = quizQuestions.length
    const q = quizQuestions[currentQuestionIdx]
    const selectedSet = new Set(currentSelectedOptions)

    return (
      <div className="max-w-4xl mx-auto">
        <ProgressBar
          value={totalTopics ? currentTopicIndex / totalTopics : 0}
          label={`Topic ${currentTopicIndex + 1} of ${totalTopics}`}
        />
        {totalQ > 0 && (
          <ProgressBar
            value={currentQuestionIdx / totalQ}
            label={`Question ${Math.min(currentQuestionIdx + 1, totalQ)} of ${totalQ}`}
          />
        )}

        <MetricRow
          items={[
            { label: 'Topics', value: `${currentTopicIndex}/${totalTopics}` },
            { label: 'Avg score', value: quizResults.length ? `${safePercent(overallAvg)}%` : '-' },
            { label: 'Study time', value: `${totalMinutes} min` },
            { label: 'Mode', value: learnerMode },
          ]}
        />

        <span className="text-xs font-bold uppercase tracking-wider text-accent">
          Knowledge check
        </span>
        <h1 className="text-3xl font-bold text-white mt-2 mb-6">{topicTitle}</h1>

        {/* Already graded answers */}
        {gradedAnswers.map((graded, i) => {
          const optionText = (ids: string[] = [], compact = false) =>
            ids
              .map((id) => {
                const text = graded.options?.find((option) => option.id === id)?.text
                return text ? `${id}. ${compact ? compactReviewText(text) : text}` : id
              })
              .join('\n')
          const feedbackText = graded.options?.length
            ? `You selected ${graded.selected_option_ids?.join(', ') || 'no option'}. Correct option(s): ${graded.correct_option_ids?.join(', ') || 'N/A'}. Review the expected answer below.`
            : graded.feedback

          return (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-xl border border-white/10 bg-gradient-to-r from-white/5 to-white/2 p-5 mb-4 hover:border-indigo-500/30 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 flex-1">
                <Badge variant={graded.correct ? 'success' : 'warning'}>
                  {graded.correct ? '✓ Correct' : '⚠ Review'}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    Q{i + 1}: {graded.question.slice(0, 60)}...
                  </p>
                </div>
              </div>
              <div className="text-right ml-3">
                <div className="text-sm font-bold text-white">
                  {Math.round(graded.score * 100)}%
                </div>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="bg-black/30 rounded-lg p-3 border border-white/5">
                  <p className="text-xs uppercase font-semibold text-indigo-400 mb-1">Your selection</p>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {graded.selected_option_ids?.length
                      ? optionText(graded.selected_option_ids)
                      : graded.user_answer}
                  </p>
                </div>
                <div className="bg-green-900/10 rounded-lg p-3 border border-green-500/20">
                  <p className="text-xs uppercase font-semibold text-green-400 mb-1">Correct option(s)</p>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">
                    {graded.correct_option_ids?.length
                      ? optionText(graded.correct_option_ids, true)
                      : graded.expected_answer || 'N/A'}
                  </p>
                </div>
              </div>

              <div className="bg-green-900/10 rounded-lg p-3 border border-green-500/20">
                <p className="text-xs uppercase font-semibold text-green-400 mb-1">Expected answer</p>
                <div className="text-gray-300 leading-relaxed">
                  <MarkdownContent content={formatExpectedAnswer(graded.expected_answer || 'N/A')} />
                </div>
              </div>

              <div className="bg-blue-900/10 rounded-lg p-3 border border-blue-500/20">
                <p className="text-xs uppercase font-semibold text-blue-300 mb-2">Feedback</p>
                <p className="text-gray-300 leading-relaxed">{feedbackText}</p>
              </div>

              <div className="flex gap-2">
                <div className="h-2 flex-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      graded.correct ? 'bg-green-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${graded.score * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
          )
        })}

        {/* Current question */}
        {q && currentQuestionIdx < totalQ ? (
          <Card className="!hover:-translate-y-0">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="default">{q.difficulty || 'medium'}</Badge>
              <span className="text-white font-semibold">
                Question {currentQuestionIdx + 1}
              </span>
            </div>
            <p className="text-white text-lg mb-6">{q.question}</p>

            <form onSubmit={handleSubmitAnswer} className="space-y-4">
              {q.options?.length ? (
                <div className="grid gap-3">
                  {q.options.map((option) => {
                    const active = selectedSet.has(option.id)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setCurrentSelectedOptions((current) =>
                            current.includes(option.id)
                              ? current.filter((id) => id !== option.id)
                              : [...current, option.id]
                          )
                        }}
                        className={`w-full rounded-lg border p-4 text-left transition-all ${
                          active
                            ? 'border-accent bg-accent/15 text-white'
                            : 'border-white/10 bg-white/5 text-text-secondary hover:border-white/30'
                        }`}
                      >
                        <span className="font-bold text-white mr-2">{option.id}.</span>
                        {option.text}
                      </button>
                    )
                  })}
                </div>
              ) : null}

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confidence before grading: {currentConfidence}/5
                </label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={currentConfidence}
                  onChange={(e) => setCurrentConfidence(Number(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              {!q.options?.length ? (
                <TextArea
                  placeholder="Type a clear answer in your own words..."
                  rows={5}
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                />
              ) : null}

              <Button
                type="submit"
                variant="primary"
                fullWidth
                disabled={loading || (Boolean(q.options?.length) && currentSelectedOptions.length === 0)}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <ArrowRight size={16} />
                )}
                Submit answer
              </Button>
            </form>
          </Card>
        ) : (
          // Quiz complete for this topic
          <Card className="!hover:-translate-y-0 text-center">
            <CheckCircle2 size={48} className="text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Quiz complete!</h2>

            <div className="grid grid-cols-2 gap-4 my-6">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <span className="text-text-secondary text-sm">Score</span>
                <p className="text-2xl font-bold text-white">
                  {safePercent(computeAverage(gradedAnswers))}%
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <span className="text-text-secondary text-sm">Avg confidence</span>
                <p className="text-2xl font-bold text-white">
                  {confidenceLog.length
                    ? (confidenceLog.reduce((a, b) => a + b, 0) / confidenceLog.length).toFixed(1) + '/5'
                    : '-'}
                </p>
              </div>
            </div>

            <Button variant="primary" onClick={handleAdvanceAfterQuiz} disabled={loading} fullWidth>
              {loading ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
              Continue
            </Button>
          </Card>
        )}
      </div>
    )
  }

  const renderComplete = () => (
    <div className="max-w-4xl mx-auto text-center">
      <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
      <span className="text-xs font-bold uppercase tracking-wider text-accent">
        Session review
      </span>
      <h1 className="text-3xl font-bold text-white mt-2 mb-2">Session complete!</h1>
      {roadmap && <p className="text-text-secondary mb-6">{roadmap.goal}</p>}

      <MetricRow
        items={[
          { label: 'Topics', value: `${quizResults.length}/${totalTopics}` },
          { label: 'Avg score', value: `${safePercent(overallAvg)}%` },
          { label: 'Study time', value: `${totalMinutes} min` },
          { label: 'Mode', value: learnerMode },
        ]}
      />

      {quizResults.length > 0 && (
        <Card className="!hover:-translate-y-0 text-left mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Results by topic</h2>
          {quizResults.map((r, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-white font-medium">{r.topic}</span>
              <span className="text-text-secondary">
                {safePercent(r.score)}%
                {r.weak_areas.length > 0 && (
                  <span className="text-yellow-400 text-xs ml-2">
                    review: {r.weak_areas.slice(0, 2).join(', ')}
                  </span>
                )}
              </span>
            </div>
          ))}
        </Card>
      )}

      {weakAreas.length > 0 && (
        <Card className="!hover:-translate-y-0 mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">Topics to revisit</h2>
          <p className="text-text-secondary">{weakAreas.slice(0, 8).join(', ')}</p>
        </Card>
      )}

      <p className="text-text-secondary mb-6">
        Session ID: <code className="text-accent">{sessionId}</code>
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button variant="primary" onClick={downloadBrief}>
          <Download size={16} />
          Download learning brief
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setScreen('GOAL_INPUT')
            setSessionId(null)
            setRoadmap(null)
            setQuizResults([])
            setWeakAreas([])
            setGoal('')
            setError('')
          }}
        >
          <RotateCcw size={16} />
          Start a new session
        </Button>
      </div>
    </div>
  )

  // ── Main render ──────────────────────────────────────────────

  return (
    <div className="min-h-screen px-4 py-24 bg-gradient-to-b from-dark-bg via-dark-bg to-black">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb / stage indicator */}
        <div className="flex items-center gap-2 mb-8">
          {(['GOAL_INPUT', 'ROADMAP_APPROVAL', 'EXPLAINING', 'QUIZZING', 'COMPLETE'] as Screen[]).map(
            (s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <ArrowRight size={14} className="text-text-secondary" />}
                <span
                  className={`text-xs font-bold uppercase tracking-wider ${
                    s === screen ? 'text-accent' : 'text-text-secondary/50'
                  }`}
                >
                  {SCREEN_LABELS[s]}
                </span>
              </React.Fragment>
            )
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-3">
            <AlertCircle size={18} />
            {error}
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Screen content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {screen === 'GOAL_INPUT' && renderGoalInput()}
            {screen === 'ROADMAP_APPROVAL' && renderRoadmapApproval()}
            {screen === 'EXPLAINING' && renderExplaining()}
            {screen === 'QUIZZING' && renderQuizzing()}
            {screen === 'COMPLETE' && renderComplete()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
