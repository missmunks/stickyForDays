
import { useState, useEffect } from 'react'
import Link from 'next/link'

const AGREED_KEY = 'waiver_accepted_v3'

export default function Release(){ 
  const [checked, setChecked] = useState(false)
  const [ready, setReady] = useState(false)
  const [signerName, setSignerName] = useState('')
  useEffect(()=>{ setReady(true) },[])

  async function agree(){
    try {
      await fetch('/.netlify/functions/waiver-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: signerName || 'Guest' })
      });
    } catch {}
    localStorage.setItem(AGREED_KEY,'1');
    window.location.href='/';
  }<br />

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-yellow-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-center">⚠️ Release of Liability — Caramel Apple / Pumpkin Art / Chaos</h1>
        <div className="bg-white rounded-2xl shadow p-6 space-y-4 leading-relaxed text-base">
         <P>By checking “I Agree,” each participant and any parent or legal guardian of a minor attendee confirms they have read and understood this Release of Liability, Assumption of Risk, and Indemnity Agreement, and agrees to be bound. You understand that participation in Caramel Apple / Pumpkin Art / Chaos involves inherent risks: slips, trips, falls, sticky floors, messy crafts, running children, and outdoor surfaces. To the fullest extent permitted by law, you release and hold harmless the hosts, organizers, volunteers, and property owners from claims arising from ordinary negligence or inherent risks. You accept responsibility for your own participation and for supervising any minor you accompany; you will choose foods and crafts that are appropriate, and you’ll stop any activity that seems unsafe. Injuries specifically contemplated include falling from trees, rough‑and‑tumble collisions, and encounters with caramel, chocolate, paint, sprinkles, glitter, or craft supplies. Hosts are not responsible for lost, stolen, damaged, or sticky personal items. Allergens may be present; you are responsible for dietary choices. Nothing here waives non‑waivable rights; if any provision is invalid, the rest remains in effect.
<br />Plain‑English Notes: This is a fun, high‑energy, sticky situation. There will be laughter, glitter, and the occasional sprint. We have lots of 1980s-esque play things. The giant teeter-totter is metal, tall, and a major shin buster. Hot caramel is hot. Melted chocolate is hot. Hot glue guns are hot. The zip line probably won’t break, but it might. The rooster has never been mean, but today might be the day. Grabbing the disc swing and sprinting down the hill might result in a concussion. We do our best to keep things safe; you do your best to keep your tiny tornado safe.
<br />Party Reality: Gravity remains operational. Gravity is undefeated. Caramel is persuasive; chocolate is hypnotic; sprinkles migrate like colorful geese; glitter applies for permanent residency; marshmallows develop strong opinions when warmed; socks sometimes pursue diplomacy with fountains; paint negotiates with sleeves; and time moves in “party minutes.” Hydrate, breathe, snack, repeat.
<br />Lost and found policy: if it is shiny and sticky, it is probably loved and will be reunited; if it is a sock that has found it’s way into the depths of chaos, it has been chosen.
<br />Food Zone: Self‑serve caramel apple bar/buffet is a choose‑your‑own adventure. Nuts may exist, dairy may lurk, candy may pop, dyes may leave you pooping blue for a week. Read labels, ask questions, and when in doubt, choose a safe option. See the “I have an allergy!” section on the main page for guest‑shared notes. We’ll do our best to keep any known allergies protected. When in doubt, try a rice cake and a hug.
<br />Trees are scenic, not trampolines; fences are fences, not balance beams;  the zip line brake calculations are based on weight, and we did the math, sooooo…... Capes are optional but do not confer the power of flight.







</P>
          <label className="block mb-3">
            <span className="text-sm font-medium">Your name (for the waiver record)</span>
            <input
              value={signerName}
              onChange={e=>setSignerName(e.target.value)}
              placeholder="Type your name"
              className="border p-2 rounded w-full mt-1"
            />
          </label>

          <label className="flex items-center gap-3 mt-2">
            <input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)} />
            <span className="font-medium">I have read and agree to the Release of Liability for myself and any minor I accompany.</span>
          </label>
          <div className="flex items-center gap-3">
            <button onClick={agree} disabled={!checked || !ready} className={`px-4 py-2 rounded bg-emerald-600 text-white ${(!checked||!ready)?'opacity-60 pointer-events-none':''}`}>I Agree</button>
            <Link href="/" className="underline text-blue-700">Back</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
