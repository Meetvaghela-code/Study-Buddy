'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Brain, CheckCircle2, Lock, Mail, Sparkles, User, Zap } from 'lucide-react'
import { Button, Badge } from '@/components/ui/Button'
import { Input, Checkbox } from '@/components/ui/Input'

type Mode = 'login' | 'register'

type AuthResponse = {
  user?: { id: string; name: string; email: string }
  error?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isRegister = mode === 'register'

  useEffect(() => {
    let active = true
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((response) => {
        const next = new URLSearchParams(window.location.search).get('next')
        if (active && response.ok) router.replace(next && next.startsWith('/') ? next : '/dashboard')
      })
      .catch(() => {
        // Signed-out users should stay on the auth screen.
      })
    return () => {
      active = false
    }
  }, [router])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, rememberMe }),
      })
      const data = (await response.json()) as AuthResponse
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Authentication failed.')
      }

      if (isRegister) {
        setMode('login')
        setPassword('')
        setError('Account created. Please sign in to continue.')
        return
      }

      const next = new URLSearchParams(window.location.search).get('next')
      router.push(next && next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-bg via-[#101516] to-black px-4 py-10">
      <div className="mx-auto grid min-h-[calc(100vh-7rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative flex min-h-[520px] flex-col justify-between overflow-hidden border-b border-white/10 bg-black/20 p-8 lg:border-b-0 lg:border-r lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,163,127,0.22),transparent_32%),radial-gradient(circle_at_80%_90%,rgba(34,197,94,0.16),transparent_30%)]" />
          <div className="relative">
            <div className="mb-10 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-gradient-to-br from-accent to-green-500 text-lg font-bold text-white shadow-glow">
                λ
              </div>
              <div>
                <div className="text-xl font-bold gradient-text">StudyBuddy</div>
                <div className="text-xs uppercase tracking-wider text-text-secondary">Local learning workspace</div>
              </div>
            </div>

            <Badge variant="info" className="mb-5 inline-flex items-center gap-2">
              <Sparkles size={14} />
              Personal progress, local first
            </Badge>
            <h1 className="max-w-xl text-4xl font-bold leading-tight text-white md:text-5xl">
              Keep every roadmap, quiz, and weak spot tied to your account.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-secondary">
              Sign in to turn your study sessions into a personal dashboard with
              quiz history, active topics, streaks, and review areas.
            </p>
          </div>

          <div className="relative grid gap-4 md:grid-cols-3">
            {[
              { icon: <Brain size={18} />, title: 'Adaptive quizzes', text: 'Topic-specific checks with review feedback.' },
              { icon: <BookOpen size={18} />, title: 'Session memory', text: 'Track roadmaps and learning goals.' },
              { icon: <CheckCircle2 size={18} />, title: 'Progress view', text: 'See scores, streaks, and weak areas.' },
            ].map((item) => (
              <div key={item.title} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="mb-3 text-accent">{item.icon}</div>
                <div className="font-semibold text-white">{item.title}</div>
                <p className="mt-1 text-sm leading-relaxed text-text-secondary">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md [perspective:1200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, rotateY: isRegister ? -18 : 18, y: 16 }}
                animate={{ opacity: 1, rotateY: 0, y: 0 }}
                exit={{ opacity: 0, rotateY: isRegister ? 18 : -18, y: -16 }}
                transition={{ duration: 0.28 }}
                className="rounded-2xl border border-white/10 bg-black/25 p-7 shadow-xl backdrop-blur"
              >
                <div className="mb-7">
                  <div className="mb-3 inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
                    {(['login', 'register'] as Mode[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setMode(item)
                          setError('')
                        }}
                        className={`rounded-md px-4 py-2 text-sm font-medium transition-all ${
                          mode === item ? 'bg-accent text-white' : 'text-text-secondary hover:text-white'
                        }`}
                      >
                        {item === 'login' ? 'Login' : 'Register'}
                      </button>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {isRegister ? 'Create your account' : 'Welcome back'}
                  </h2>
                  <p className="mt-1 text-sm text-text-secondary">
                    {isRegister
                      ? 'Start saving learning activity to your local profile.'
                      : 'Continue with your personal learning dashboard.'}
                  </p>
                </div>

                {error ? (
                  <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}

                <form onSubmit={submit} className="space-y-4">
                  {isRegister ? (
                    <Input
                      label="Name"
                      placeholder="Your name"
                      icon={<User size={18} />}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      required
                    />
                  ) : null}

                  <Input
                    type="email"
                    label="Email"
                    placeholder="you@example.com"
                    icon={<Mail size={18} />}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  <Input
                    type="password"
                    label="Password"
                    placeholder="Enter your password"
                    icon={<Lock size={18} />}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                  />

                  {!isRegister ? (
                    <Checkbox
                      label="Keep me signed in on this device"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                  ) : null}

                  <Button type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
                    <Zap size={18} />
                    {loading ? 'Working...' : isRegister ? 'Create account' : 'Sign in'}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-text-secondary">
                  {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(isRegister ? 'login' : 'register')
                      setError('')
                    }}
                    className="font-semibold text-accent hover:text-green-400"
                  >
                    {isRegister ? 'Login' : 'Register'}
                  </button>
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </div>
  )
}
