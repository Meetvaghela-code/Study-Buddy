export type QuizQuestion = {
  question: string
  options?: { id: string; text: string }[]
  correct_option_ids?: string[]
  expected_answer?: string
}

export type QuizResult = {
  status?: 'questions_ready' | 'graded' | 'error'
  topic?: string
  questions?: QuizQuestion[]
  score?: number
  graded_questions?: Array<{
    question: string
    answer: string
    selected_option_ids?: string[]
    expected_answer?: string
    score: number
    correct: boolean
    feedback: string
  }>
  weak_areas?: string[]
  message?: string
  error?: string
}

export type StudyBuddyResult = {
  source?: string
  topic?: string
  weak_areas?: string[]
  assistance?: string
  status?: 'complete' | 'error'
  error?: string
}

const quizServiceUrl = (process.env.QUIZ_SERVICE_URL ?? 'http://localhost:9001').replace(/\/$/, '')
const studyBuddyUrl = (process.env.STUDY_BUDDY_URL ?? 'http://localhost:9002').replace(/\/$/, '')

async function parseA2AResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed with status ${response.status}`)
  }

  const data = await response.json()
  const result = data?.result ?? data
  const artifacts = Array.isArray(result?.artifacts) ? result.artifacts : []
  const statusParts = Array.isArray(result?.status?.message?.parts) ? result.status.message.parts : []
  const parts = [...(artifacts[0]?.parts ?? []), ...statusParts]

  for (const part of parts) {
    if ((part?.type === 'text' || part?.kind === 'text') && typeof part.text === 'string') {
      try {
        return JSON.parse(part.text)
      } catch {
        return { text: part.text }
      }
    }
  }

  return result
}

async function sendTask(baseUrl: string, payload: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tasks/send',
      params: {
        id: crypto.randomUUID(),
        message: {
            messageId: crypto.randomUUID(),
          role: 'user',
          parts: [{ type: 'text', text: JSON.stringify(payload) }],
        },
      },
    }),
  })

  return parseA2AResponse(response)
}

export async function requestQuiz(payload: {
  topic: string
  explanation: string
  answers?: Array<string | string[]>
}) {
  return (await sendTask(quizServiceUrl, payload)) as QuizResult
}

export async function requestStudyBuddy(payload: {
  topic: string
  explanation: string
  weak_areas?: string[]
}) {
  return (await sendTask(studyBuddyUrl, payload)) as StudyBuddyResult
}

export async function getServiceStatuses() {
  const [quizResponse, studyBuddyResponse] = await Promise.allSettled([
    fetch(`${quizServiceUrl}/.well-known/agent-card.json`, { cache: 'no-store' }),
    fetch(`${studyBuddyUrl}/.well-known/agent-card.json`, { cache: 'no-store' }),
  ])

  const quiz =
    quizResponse.status === 'fulfilled' && quizResponse.value.ok
      ? await quizResponse.value.json()
      : null
  const studyBuddy =
    studyBuddyResponse.status === 'fulfilled' && studyBuddyResponse.value.ok
      ? await studyBuddyResponse.value.json()
      : null

  return {
    quiz: {
      ok: Boolean(quiz),
      name: quiz?.name ?? 'Quiz Generator Service',
      url: quizServiceUrl,
      description: quiz?.description ?? '',
    },
    studyBuddy: {
      ok: Boolean(studyBuddy),
      name: studyBuddy?.name ?? 'CrewAI Study Buddy',
      url: studyBuddyUrl,
      description: studyBuddy?.description ?? '',
    },
  }
}
