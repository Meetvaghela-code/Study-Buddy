// Types mirroring the Python graph state (src/graph/state.py)
// and the FastAPI backend responses (src/server/api.py)

export interface Topic {
  title: string
  description: string
  estimated_minutes: number
  prerequisites: string[]
}

export interface StudyRoadmap {
  goal: string
  topics: Topic[]
  generated_at?: string
}

export interface QuizQuestion {
  question: string
  options?: { id: string; text: string }[]
  correct_option_ids?: string[]
  expected_answer: string
  difficulty?: string
}

export interface GradedQuestion {
  question: string
  expected_answer: string
  options?: { id: string; text: string }[]
  correct_option_ids?: string[]
  selected_option_ids?: string[]
  user_answer: string
  correct: boolean
  feedback: string
  score: number
}

export interface QuizResult {
  topic: string
  questions: GradedQuestion[]
  score: number
  weak_areas: string[]
}

export interface StartSessionResponse {
  session_id: string
  interrupt: boolean
  payload?: {
    roadmap: StudyRoadmap
    message?: string
  }
  result?: Record<string, unknown>
}

export interface ApproveResponse {
  interrupt: boolean
  payload?: {
    roadmap: StudyRoadmap
    message?: string
  }
  roadmap?: StudyRoadmap | null
  current_topic_index: number
  topic_title: string
  topic_description: string
  explanation: string
  quiz_questions: QuizQuestion[]
}

export interface AdvanceResponse {
  messages: unknown[]
  coaching_message: string
  quiz_results: QuizResult[]
  weak_areas: string[]
  current_topic_index: number
  roadmap: StudyRoadmap | null
}

export type Screen = 'GOAL_INPUT' | 'ROADMAP_APPROVAL' | 'EXPLAINING' | 'QUIZZING' | 'COMPLETE'

export type LearnerMode = 'Balanced' | 'Deep focus' | 'Exam sprint'

export const SCREEN_LABELS: Record<Screen, string> = {
  GOAL_INPUT: 'Design',
  ROADMAP_APPROVAL: 'Approve',
  EXPLAINING: 'Learn',
  QUIZZING: 'Quiz',
  COMPLETE: 'Review',
}

export const GOAL_PRESETS = [
  'Learn Python closures and decorators from scratch',
  'Understand clinical trial basics for AI product work',
  'Master LangGraph checkpoints, interrupts, and agent routing',
]
