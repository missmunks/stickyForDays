// pages/release.js
import { useEffect, useState } from 'react'
import Link from 'next/link'

const AGREED_SESSION_KEY = 'waiver_ok_session'

export default function Release() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [coveredNames, setCoveredNames] = useState('') // one per line
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [alreadyAgreed, setAlreadyAgreed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAlreadyAgreed(sessionStorage.getItem(AGREED_SESSION_KEY) === '1')
    }
  }, [])

  async function handleWaiverSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Name is required.')
      return
    }
    if (!agree) {
      setError('You must accept the Release of Liability.')
      return
    }

    const covered = coveredNames
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)

    setBusy(true)
    try {
      const res = await fetch('/.netlify/functions/waiver-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          email: email.trim() || null,
          covered_names: covered,        // array of strings
          method: 'checkbox',            // simple provenance tag
        }),
      })

      if (!res.ok) {
        const t = await res.text().catch(() => '')
        throw new Error(t || 'Failed to save waiver')
      }

      // Mark this browser session as agreed so RSVP unlocks
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(AGREED_SESSION_KEY, '1')
      }

      // Optional: clear form (not strictly needed if you redirect)
      setName(''); setEmail(''); setCoveredNames(''); setAgree(false)

      // Send back to the homepage where RSVP lives
      if (typeof window !== 'undefined') {
        window.location.href = '/'
      }
    } catch (err) {
      setError(err.message || 'Failed to save waiver')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-pink-50">
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-4xl font-extrabold">Release of Liability</h1>
          <Link href="/" className="text-blue-600 underline">← Back</Link>
        </div>

        {alreadyAgreed && (
          <div className="bg-emerald-50 text-emerald-900 border border-emerald-300 rounded-lg p-3">
            You already accepted the waiver in this session. Re-submitting will log another entry.
          </div>
        )}

        {/* Put your actual waiver text here */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow p-5 leading-relaxed border">
          <p className="mb-3">
            By attending this event, I acknowledge and assume all risks associated with participation,
            including (but not limited to) food allergies, slips, trips, minor burns from hot caramel/chocolate,
            craft tools, and general party chaos. I agree to act responsibly, supervise any minors in my party,
            and hold the organizers harmless from claims arising from ordinary risks of the event.
          </p>
          <p>
            I confirm I have read and understood this Release of Liability and I am signing it voluntarily.
          </p>
        </div>

        {/* Waiver form */}
        <form onSubmit={handleWaiverSubmit} className="bg-white rounded-2xl shadow p-5 border space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 border border-red-300 rounded p-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Your full name <span className="text-red-600">*</span></label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="border p-2 rounded w-full"
              placeholder="e.g., Jessica D—parent/guardian or adult attendee"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Covered names (one per line)</label>
            <textarea
              value={coveredNames}
              onChange={e => setCoveredNames(e.target.value)}
              rows={4}
              className="border p-2 rounded w-full"
              placeholder={'Child or guest names covered by this waiver\ne.g.\nDani D\nSam D'}
            />
            <p className="text-xs text-gray-600 mt-1">
              Add the names of everyone you’re covering (kids/guests). One name per line.
            </p>
          </div>

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              className="mt-1"
              required
            />
            <span>
              I have read and accept the Release of Liability.
            </span>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white px-4 py-2 rounded"
          >
            {busy ? 'Submitting…' : 'I Accept'}
          </button>
        </form>
      </main>
    </div>
  )
}
