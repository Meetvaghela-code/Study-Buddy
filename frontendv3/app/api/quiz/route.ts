import { NextResponse } from 'next/server'
import { requestQuiz } from '@/lib/a2a'

const backendUrl = (process.env.QUIZ_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const topic = typeof body.topic === 'string' ? body.topic : 'General Topic'
    const explanation = typeof body.explanation === 'string' ? body.explanation : ''
    const answers = Array.isArray(body.answers)
      ? body.answers.filter((answer: unknown): answer is string | string[] =>
          typeof answer === 'string' ||
          (Array.isArray(answer) && answer.every((item) => typeof item === 'string'))
        )
      : []

    // If a QUIZ_API_URL is configured (or default), use the FastAPI backend
    // to generate questions and grade answers. Otherwise fall back to A2A.
    if (backendUrl) {
      // Generate questions from backend
      const genResp = await fetch(`${backendUrl}/api/quiz/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, explanation }),
      })

      if (!genResp.ok) {
        const text = await genResp.text()
        throw new Error(text || `Generation failed: ${genResp.status}`)
      }

      const genJson = await genResp.json()
      const questions = genJson.questions ?? []

      // If no answers provided, return generated questions
      if (!answers.length) {
        return NextResponse.json({ status: 'questions_ready', topic, questions })
      }

      // Grade each provided answer against the corresponding expected answer
      const graded = []
      let total = 0
      const weakAreas: string[] = []

      for (let i = 0; i < answers.length && i < questions.length; i++) {
        const q = questions[i]
        const selectedOptionIds = Array.isArray(answers[i]) ? answers[i] : []
        const studentAnswer = Array.isArray(answers[i]) ? selectedOptionIds.join(', ') : answers[i]
        const gradeResp = await fetch(`${backendUrl}/api/quiz/grade`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q.question,
            expected_answer: q.expected_answer,
            options: q.options ?? [],
            correct_option_ids: q.correct_option_ids ?? [],
            selected_option_ids: selectedOptionIds,
            student_answer: studentAnswer,
          }),
        })

        if (!gradeResp.ok) {
          const text = await gradeResp.text()
          throw new Error(text || `Grading failed: ${gradeResp.status}`)
        }

        const gradeJson = await gradeResp.json()
        const score = typeof gradeJson.score === 'number' ? gradeJson.score : parseFloat(gradeJson.score) || 0
        total += score
        if (gradeJson.missing_concept) weakAreas.push(gradeJson.missing_concept)

        graded.push({
          question: q.question,
          answer: studentAnswer,
          selected_option_ids: selectedOptionIds,
          expected_answer: q.expected_answer,
          score,
          correct: Boolean(gradeJson.correct),
          feedback: gradeJson.feedback ?? '',
        })
      }

      const avg = questions.length ? total / questions.length : 0
      return NextResponse.json({ status: 'graded', topic, questions, graded_questions: graded, score: avg, weak_areas: Array.from(new Set(weakAreas)) })
    }

    // Fallback to A2A path
    const result = await requestQuiz({ topic, explanation, answers })
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to generate quiz'
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    )
  }
}
