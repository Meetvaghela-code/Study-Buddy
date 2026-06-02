'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { Button, Badge, Card } from '@/components/ui/Button'
import { Input, TextArea } from '@/components/ui/Input'
import type { QuizResult } from '@/lib/a2a'

type QuizQuestion = {
  question: string
  options?: { id: string; text: string }[]
  correct_option_ids?: string[]
  expected_answer?: string
}

export default function PracticePage() {
  const [topic, setTopic] = useState('Python closures')
  const [explanation, setExplanation] = useState(
    'A closure is a function that remembers the variables from the scope where it was created.'
  )
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [answers, setAnswers] = useState<Record<number, string[]>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generatedQuestions = useMemo(() => questions.length > 0, [questions.length])

  const generateQuiz = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, explanation, answers: [] }),
      })
      const data = (await response.json()) as QuizResult

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Unable to generate quiz')
      }

      setQuestions((data.questions ?? []).map((item) => ({
        question: item.question,
        options: item.options,
        correct_option_ids: item.correct_option_ids,
        expected_answer: item.expected_answer,
      })))
      setAnswers({})
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const submitQuiz = async () => {
    setLoading(true)
    setError('')

    try {
      const orderedAnswers = questions.map((_, index) => answers[index] ?? [])
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, explanation, answers: orderedAnswers }),
      })
      const data = (await response.json()) as QuizResult

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Unable to submit quiz')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-4 py-24 bg-gradient-to-b from-dark-bg via-dark-bg to-black">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-3xl mx-auto"
        >
          <Badge variant="info" className="mb-4 inline-flex items-center gap-2">
            <Sparkles size={14} />
            Guided practice session
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Practice with adaptive questions and feedback
          </h1>
          <p className="text-text-secondary text-lg">
            Generate topic-focused questions, answer them step by step, and review your results with clear feedback.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <BookOpen className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Create a quiz</h2>
            </div>

            <div className="space-y-4">
              <Input label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
              <TextArea
                label="Explanation context"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={6}
              />

              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => {
                  void generateQuiz()
                }} disabled={loading}>
                  {loading && !generatedQuestions ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                  Generate Questions
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTopic('Python decorators')
                    setExplanation('A decorator wraps a function to add behavior without changing the function body.')
                  }}
                  disabled={loading}
                >
                  Load example
                </Button>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Live status</h2>
            </div>

            {!generatedQuestions ? (
              <div className="space-y-4 text-text-secondary">
                <p>Generate questions to begin an actual backend-assisted practice session.</p>
                <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                  The quiz service will return 3 questions, and this page will send your answers back to the backend for grading.
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div key={index} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <div className="text-white font-medium">{index + 1}. {question.question}</div>
                    <div className="grid gap-2">
                      {question.options?.map((option) => {
                        const selected = answers[index]?.includes(option.id) ?? false
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              setAnswers((current) => {
                                const existing = current[index] ?? []
                                return {
                                  ...current,
                                  [index]: existing.includes(option.id)
                                    ? existing.filter((id) => id !== option.id)
                                    : [...existing, option.id],
                                }
                              })
                            }
                            className={`rounded-lg border p-3 text-left text-sm transition-all ${
                              selected
                                ? 'border-accent bg-accent/15 text-white'
                                : 'border-white/10 bg-black/20 text-text-secondary hover:border-white/30'
                            }`}
                          >
                            <span className="font-bold text-white mr-2">{option.id}.</span>
                            {option.text}
                          </button>
                        )
                      })}
                    </div>
                    {question.expected_answer ? (
                      <p className="text-xs text-text-secondary">
                        Backend hint is available after grading.
                      </p>
                    ) : null}
                  </div>
                ))}

                <Button variant="primary" onClick={() => void submitQuiz()} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle2 size={16} />}
                  Submit Answers
                </Button>
              </div>
            )}
          </Card>
        </div>

        {questions.length > 0 ? (
          <Card>
            <div id="quiz-answers" className="flex items-center gap-3 mb-6">
              <ArrowRight className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Generated questions</h2>
            </div>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="rounded-xl bg-black/20 border border-white/10 p-4 text-text-secondary">
                  <div className="text-white font-medium mb-2">Question {index + 1}</div>
                  <p>{question.question}</p>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        {result?.status === 'graded' ? (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Backend grading result</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-text-secondary text-sm">Score</div>
                <div className="text-3xl font-bold text-white">{Math.round((result.score ?? 0) * 100)}%</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-text-secondary text-sm">Weak areas</div>
                <div className="text-white font-medium">{result.weak_areas?.length ? result.weak_areas.join(', ') : 'None detected'}</div>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <div className="text-text-secondary text-sm">Status</div>
                <div className="text-white font-medium">{result.status}</div>
              </div>
            </div>

            <div className="space-y-4">
              {result.graded_questions?.map((item, index) => (
                <div key={index} className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <h3 className="text-white font-medium">{item.question}</h3>
                    <Badge variant={item.correct ? 'success' : 'warning'}>
                      {Math.round(item.score * 100)}%
                    </Badge>
                  </div>
                  <p className="text-text-secondary text-sm">{item.feedback}</p>
                  {item.expected_answer ? (
                    <p className="text-green-300 text-sm mt-2">Expected: {item.expected_answer}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
