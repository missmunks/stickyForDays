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
           By checking “I Agree,” each participant and any parent or legal guardian of a minor attendee confirms they have read and understood this Release of Liability, Assumption of Risk, and Indemnity Agreement, and agrees to be bound. You understand that participation in Caramel Apple / Pumpkin Art / Chaos involves inherent risks: slips, trips, falls, sticky floors, messy crafts, running children, and outdoor surfaces. To the fullest extent permitted by law, you release and hold harmless the hosts, organizers, volunteers, and property owners from claims arising from ordinary negligence or inherent risks. You accept responsibility for your own participation and for supervising any minor you accompany; you will choose foods and crafts that are appropriate, and you’ll stop any activity that seems unsafe. Injuries specifically contemplated include falling from trees, rough‑and‑tumble collisions, and encounters with caramel, chocolate, paint, sprinkles, glitter, or craft supplies. Hosts are not responsible for lost, stolen, damaged, or sticky personal items. Allergens may be present; you are responsible for dietary choices. Nothing here waives non‑waivable rights; if any provision is invalid, the rest remains in effect.

Plain‑English Notes:  This is a fun, high‑energy, sticky situation. There will be laughter, glitter, and the occasional sprint. We have lots of 1980s-esque play things. The giant teeter-totter is metal, tall, and a major shin buster. Hot caramel is hot. Melted chocolate is hot. Hot glue guns are hot. The zip line probably won’t break, but it might. The rooster has never been mean, but today might be the day. Grabbing the disc swing and sprinting down the hill might result in a concussion. We do our best to keep things safe; you do your best to keep your tiny tornado safe.

Party Reality:  Gravity remains operational. Gravity is undefeated. Caramel is persuasive; chocolate is hypnotic; sprinkles migrate like colorful geese; glitter applies for permanent residency; marshmallows develop strong opinions when warmed; socks have double lives we know nothing about; paint settles in for the long haul; and time moves in “party minutes.” Hydrate, breathe, snack, repeat.

Lost and found policy:  If it is shiny and sticky, it is probably loved and will be reunited if at all possible; if it is a sock that has found it’s way into the depths of chaos, it has been chosen.

Food Zone: Self‑serve caramel apple bar/buffet is a choose‑your‑own adventure. Nuts may exist, dairy may lurk, candy may pop, dyes may leave you pooping blue for a week. Read labels, ask questions, and when in doubt, choose a safe option. See the “I have an allergy!” section on the main page for guest‑shared notes. We’ll do our best to keep any known allergies protected. When in doubt, try a rice cake and a hug.

Trees are scenic, not trampolines; fences are fences, not balance beams; the zip line brake calculations are based on weight and pitch - and we did the math, sooooo…... Capes are optional but do not confer the power of flight.

Your name (for the waiver record)
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
