export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { ArrowRight, BarChart3, Brain, Layers3, MessageSquare, PlayCircle, Sparkles, Target, ShieldCheck } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-dark-bg via-[#0f1314] to-black text-white">
      <section className="relative overflow-hidden px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,163,127,0.20),transparent_28%),radial-gradient(circle_at_80%_12%,rgba(34,197,94,0.14),transparent_24%),linear-gradient(to_bottom,rgba(255,255,255,0.03),transparent)]" />

        <div className="relative mx-auto max-w-7xl space-y-16">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
            <div className="max-w-3xl space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent">
                <Sparkles size={14} />
                Product showcase for a multi-agent learning workspace
              </div>

              <div className="space-y-5">
                <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
                  Turn learning into a guided product experience.
                </h1>
                <p className="max-w-2xl text-lg leading-relaxed text-text-secondary sm:text-xl">
                  StudyBuddy combines roadmap planning, adaptive quizzes, and AI coaching into one production-ready flow. See your goals, practice, and weak areas in a single connected workspace.
                </p>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-accent to-green-500 px-6 py-3 text-base font-semibold text-white shadow-glow transition-transform hover:-translate-y-0.5"
                >
                  Get started
                  <ArrowRight size={18} className="ml-2" />
                </Link>
                <a
                  href="#showcase"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <PlayCircle size={18} className="mr-2" />
                  Explore product tour
                </a>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Adaptive paths', value: 'Roadmaps that react to progress' },
                  { label: 'Quiz feedback', value: 'Graded answers with weak-area tracking' },
                  { label: 'AI coaching', value: 'Clearer explanations in context' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{item.label}</p>
                    <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div id="showcase" className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-4 shadow-2xl backdrop-blur">
              <div className="rounded-[1.5rem] border border-white/10 bg-[#111717] p-5 sm:p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Live product showcase</p>
                    <h2 className="mt-2 text-2xl font-bold text-white">StudyBuddy dashboard</h2>
                  </div>
                  <div className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                    Connected
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-accent to-green-500">
                        <Layers3 size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Roadmap builder</p>
                        <p className="text-xs text-text-secondary">Plan the learning sequence</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {['Set goal', 'Choose pace', 'Generate topics', 'Start learning'].map((step, index) => (
                        <div key={step} className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-sm text-text-secondary">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                            {index + 1}
                          </span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                        <Target size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Quiz insight</p>
                        <p className="text-xs text-text-secondary">Adaptive feedback after grading</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white">Score</span>
                          <span className="font-semibold text-green-300">84%</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white/10">
                          <div className="h-2 w-[84%] rounded-full bg-gradient-to-r from-accent to-green-500" />
                        </div>
                      </div>

                      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-100">
                        Weak area detected: closures
                      </div>
                      <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-100">
                        Coach suggestion: review examples and reattempt the topic.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    {[
                      { icon: <Brain size={18} />, title: 'Adaptive learning', text: 'Move topic by topic with context preserved.' },
                      { icon: <MessageSquare size={18} />, title: 'AI coaching', text: 'Ask for clearer explanations and examples.' },
                      { icon: <BarChart3 size={18} />, title: 'Progress analytics', text: 'Track scores, streaks, and review areas.' },
                    ].map((item) => (
                      <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="mb-3 text-accent">{item.icon}</div>
                        <h3 className="font-semibold text-white">{item.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-6 lg:grid-cols-3">
            {[
              {
                icon: <ShieldCheck size={18} />,
                title: 'Local-first by design',
                text: 'Keep sessions, quizzes, and progress inside your workspace with a simple authentication flow.',
              },
              {
                icon: <Target size={18} />,
                title: 'Goal-driven learning',
                text: 'Start with a learning goal and let the roadmap, explanation, and quiz adapt to it.',
              },
              {
                icon: <MessageSquare size={18} />,
                title: 'Coach + quiz loop',
                text: 'Weak answers are turned into coaching hints so the next topic is easier to understand.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-xl backdrop-blur">
                <div className="mb-4 inline-flex rounded-xl border border-accent/20 bg-accent/10 p-3 text-accent">
                  {item.icon}
                </div>
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.text}</p>
              </div>
            ))}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 shadow-2xl backdrop-blur sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Production-ready flow</p>
                <h2 className="text-3xl font-bold text-white sm:text-4xl">A clear path from landing page to learning session.</h2>
                <p className="text-text-secondary">
                  Open the landing page, sign in, generate a roadmap, study the explanation, and move through quizzes with progress preserved.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/login" className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-accent to-green-500 px-6 py-3 text-sm font-semibold text-white shadow-glow">
                  Start learning
                </Link>
                <Link href="/dashboard" className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-black/20 px-6 py-3 text-sm font-semibold text-white">
                  Open dashboard
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
