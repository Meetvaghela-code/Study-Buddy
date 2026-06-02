'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Badge, Button, Card } from '@/components/ui/Button'
import { Input, TextArea } from '@/components/ui/Input'
import { Loader2, MessageSquare, Sparkles, Wand2 } from 'lucide-react'
import { MarkdownContent } from '@/components/MarkdownContent'

export default function CoachPage() {
  const [topic, setTopic] = useState('Python closures')
  const [explanation, setExplanation] = useState(
    'A closure is a function that remembers the variables from the scope where it was created.'
  )
  const [weakAreas, setWeakAreas] = useState('scope, inner function state')
  const [assistance, setAssistance] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestHelp = async () => {
    setLoading(true)
    setError('')
    setAssistance('')

    try {
      const response = await fetch('/api/study-buddy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          explanation,
          weak_areas: weakAreas
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      })
      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Unable to contact study buddy')
      }

      setAssistance(data.assistance ?? 'No response received.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to contact study buddy')
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
            Expert coaching for tricky concepts
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Get a clearer explanation from a teaching coach
          </h1>
          <p className="text-text-secondary text-lg">
            Get a deeper explanation, a concrete example, and a memory tip tailored to the topic you are studying.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Wand2 className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Request coaching</h2>
            </div>

            <div className="space-y-4">
              <Input label="Topic" value={topic} onChange={(event) => setTopic(event.target.value)} />
              <TextArea
                label="Original explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={6}
              />
              <Input
                label="Weak areas"
                value={weakAreas}
                onChange={(event) => setWeakAreas(event.target.value)}
                placeholder="comma-separated concepts"
              />

              <Button variant="primary" onClick={() => void requestHelp()} disabled={loading}>
                {loading ? <Loader2 className="animate-spin" size={16} /> : <MessageSquare size={16} />}
                Get Supplementary Help
              </Button>

              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare className="text-accent" size={20} />
              <h2 className="text-xl font-semibold text-white">Expert coach response</h2>
            </div>

            {assistance ? (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6">
                <MarkdownContent content={assistance} />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-text-secondary">
                Ask the study buddy for a different angle, a concrete example, and a memory tip. The answer will come from the backend service.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}