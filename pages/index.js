
import { useEffect, useState } from 'react'
import Link from 'next/link'

const itemsSeed = [
  "Apple slices",
  "Pear wedges",
  "Marshmallows",
  "Rice Krispie treats",
  "Pretzel rods",
  "Pretzel twists",
  "Pretzel sticks",
  "Angel food cake cubes",
  "Pound cake bites",
  "Graham crackers",
  "Teddy Grahams",
  "Mini donuts",
  "Donut holes",
  "Waffle cone chunks",
  "Brownie bites",
  "Potato chips",
  "Cheese cubes",
  "Twinkies",
  "Little Debbie snack cakes",
  "Dried mango",
  "Dried apricots",
  "Dried figs",
  "Banana chips",
  "Dried cranberries",
  "Frozen banana slices",
  "Mini pancakes",
  "Mini waffles",
  "Churro bites",
  "Popcorn balls",
  "Caramel corn clusters",
  "Fortune cookies",
  "Rice cakes",
  "Saltines",
  "Ritz crackers",
  "Pita chips",
  "Graham pita chips",
  "Bugles",
  "Cinnamon rolls",
  "Cornbread cubes",
  "Chopped peanuts",
  "Almonds",
  "Pecans",
  "Cashews",
  "Walnuts",
  "Crushed Oreos",
  "Crumbled graham crackers",
  "Crushed pretzels",
  "Granola",
  "Toffee bits",
  "Corn flakes",
  "Fruity Pebbles",
  "Fruit Loops",
  "Cap\u2019n Crunch",
  "Lucky Charms marshmallows",
  "Rainbow sprinkles",
  "Star sprinkles",
  "Heart sprinkles",
  "Nerds",
  "Pop Rocks",
  "Skittles minis",
  "M&Ms",
  "Cotton candy bits",
  "Edible glitter",
  "Luster dust",
  "Sour gummy worms",
  "Gummy bears",
  "Mini marshmallows",
  "Shredded coconut",
  "White chocolate chips",
  "Dark chocolate chips",
  "Butterscotch chips",
  "Cinnamon sugar",
  "Crushed candy canes",
  "Caramel drizzle",
  "Cookie crumbs",
  "Nilla wafers",
  "Biscoff",
  "Chocolate chip cookies",
  "Churro dust",
  "Reeses Pieces",
  "Peanut butter cups",
  "Dried cranberry bits",
  "Crushed banana chips",
  "Marshmallow fluff drizzle",
  "Strawberries",
  "Pineapple chunks",
  "Grapes",
  "Orange wedges",
  "Clementine segments",
  "Kiwi slices",
  "Raspberries",
  "Blackberries",
  "Dried dates",
  "Coconut chunks",
  "Chips Ahoy",
  "Mini chocolate chip cookies",
  "Shortbread cookies",
  "Biscotti",
  "Cheesecake cubes",
  "Mini churros",
  "Mini Pop-Tarts",
  "Stroopwafels",
  "Pringles",
  "Cocoa Pebbles",
  "Apple Jacks",
  "Swedish Fish",
  "Sour Patch Kids",
  "Twizzlers",
  "Candy canes",
  "Lollipops",
  "Eggo bites",
  "Pancake bites",
  "Pop-Tarts chunks",
  "Ice cream cones",
  "Mini muffins",
  "Cereal bars",
  "Granola bars",
  "Puffed rice cakes",
  "S\u2019mores station"
];
const AGREED_KEY = 'waiver_accepted_v3'

export default function Home(){
  const [name, setName] = useState('')
  const [count, setCount] = useState(1)
  const [guests, setGuests] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [claimed, setClaimed] = useState({})
  const [items, setItems] = useState(itemsSeed)
  const [newItem, setNewItem] = useState('')
  const [saveState, setSaveState] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [allergies, setAllergies] = useState([])
  const [allergyName, setAllergyName] = useState('')
  const [allergyNote, setAllergyNote] = useState('')

  useEffect(()=>{ setAgreed(typeof window!=='undefined' && localStorage.getItem(AGREED_KEY)==='1') }, [])

  async function loadAll(){
    try{ setError('')
      const [rsvpRes, claimsRes, allergyRes] = await Promise.all([
        fetch('/.netlify/functions/rsvp'),
        fetch('/.netlify/functions/checklist'),
        fetch('/.netlify/functions/allergies')
      ])
      if(!rsvpRes.ok || !claimsRes.ok || !allergyRes.ok) throw new Error('Functions not reachable')
      const rsvpData = await rsvpRes.json()
      const claimsData = await claimsRes.json()
      const allergyData = await allergyRes.json()
      setGuests(rsvpData.rows || [])
      setAllergies(allergyData.rows || [])
      const map = {}
      const serverItems = new Set()
      for(const row of (claimsData.rows||[])){ map[row.item] = !!row.claimed; serverItems.add(row.item) }
      setItems(Array.from(new Set([...serverItems, ...itemsSeed])))
      setClaimed(map)
    }catch(e){ setError('Could not load from database. Check Netlify env keys & functions.') }
  }
  useEffect(()=>{ loadAll() }, [])

  async function submit(e){
    e.preventDefault()
    if(!agreed){ alert('Please read and accept the Release of Liability first.'); return }
    if(!name) return
    setLoading(true); setError('')
    try{
      const res = await fetch('/.netlify/functions/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, count: Number(count)||1, agreed:true })
      })
      if(!res.ok) throw new Error('Save failed')
      setName(''); setCount(1); await loadAll()
    }catch{ setError('Could not save RSVP') } finally { setLoading(false) }
  }

  async function toggle(item){
    const next = !claimed[item]
    setClaimed(p=>({ ...p, [item]: next }))
    setSaveState('saving')
    try{
      const res = await fetch('/.netlify/functions/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, claimed: next })
      })
      if(!res.ok) throw new Error('bad')
      setSaveState('saved'); setTimeout(()=>setSaveState(''),1200)
    }catch(e){ setSaveState('error'); setClaimed(p=>({ ...p, [item]: !next })) }
  }

  async function addItem(e){
    e.preventDefault()
    const item = newItem.trim()
    if(!item) return
    setNewItem('')
    if(!items.includes(item)) setItems(prev=>[...prev, item])
    setClaimed(p=>({ ...p, [item]: false }))
    setSaveState('saving')
    try{
      const res = await fetch('/.netlify/functions/checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item, claimed: false })
      })
      if(!res.ok) throw new Error('bad')
      setSaveState('saved'); setTimeout(()=>setSaveState(''),1200)
    }catch(e){ setSaveState('error'); setItems(prev=>prev.filter(x=>x!==item)); const cp={...claimed}; delete cp[item]; setClaimed(cp) }
  }

  async function addAllergy(e){
    e.preventDefault()
    const nm = allergyName.trim()
    const note = allergyNote.trim()
    if(!note) return
    try{
      const res = await fetch('/.netlify/functions/allergies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nm || 'Guest', note })
      })
      if(!res.ok) throw new Error('bad')
      setAllergyName(''); setAllergyNote('')
      await loadAll()
    }catch(e){
      alert('Could not save allergy (check env keys & functions)')
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-yellow-50 to-pink-50">
      <div className="bg-art pointer-events-none select-none absolute inset-0 -z-10">
        <img src="/img/apple-splat.svg" className="absolute -top-10 -left-6 w-72 opacity-90 rotate-6" alt="" />
        <img src="/img/marshmallow-stick.svg" className="absolute top-6 left-28 w-48 opacity-95 -rotate-12" alt="" />
        <img src="/img/fountain.svg" className="absolute bottom-0 left-1/2 -translate-x-1/2 w-72 opacity-70" alt="" />
        <img src="/img/glitter.svg" className="absolute top-16 right-10 w-56 opacity-70" alt="" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <p className="kicker text-pink-600">Caramel Apple / Pumpkin Art / Chaos</p>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-1">🍏 Party Time 🎉</h1>
          <p className="text-center text-base mb-3">Sunday, October 21 — Bring a pumpkin to paint + a topping to share!</p>
          {!agreed && (
            <div className="bg-yellow-100 text-yellow-900 border border-yellow-300 rounded-lg p-3 inline-block">
              Please read and accept the <Link href="/release" className="underline font-semibold">Release of Liability</Link> to enable RSVPs.
            </div>
          )}
          <div className="flex justify-center gap-3 mt-3">
            <a className="px-4 py-2 rounded-full bg-emerald-600 text-white" href="sms:+18054235433?body=Hi!%20Question%20about%20the%20Caramel%20Apple%20/%20Pumpkin%20Art%20/%20Chaos%20party">Text</a>
            <a className="px-4 py-2 rounded-full bg-indigo-600 text-white" href="mailto:mucktruck@duck.com?subject=Caramel%20Apple%20/%20Pumpkin%20Art%20/%20Chaos%20Question">Email</a>
          </div>
        </div>

        {/* TOP (RSVP) tilted */}
        <section className="section-card backdrop-blur p-6 rounded-2xl shadow-xl border-4 border-pink-300 rotate-2">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold mb-3">RSVP</h2>
            <div className="flex items-center gap-2">
              {saveState==='saving' && <span className="badge bg-yellow-200 text-yellow-900">Saving…</span>}
              {saveState==='saved' && <span className="badge bg-green-200 text-green-900">Saved</span>}
              {saveState==='error' && <span className="badge bg-red-200 text-red-900">Not saved</span>}
            </div>
          </div>
          <form onSubmit={submit} className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${!agreed ? 'opacity-50' : ''}`}>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your Name" className="border p-2 rounded" disabled={!agreed} />
            <input type="number" min="1" value={count} onChange={e=>setCount(e.target.value)} placeholder="# of people" className="border p-2 rounded" disabled={!agreed} />
            <button className="bg-green-500 hover:bg-green-600 text-white p-2 rounded" disabled={loading||!agreed}>{loading ? 'Saving...' : 'Add RSVP'}</button>
          </form>
          {error && <p className="text-red-600 mt-2">{error}</p>}
          <ul className="mt-4 space-y-1">
            {guests.map((g,i)=>(<li key={i}>✅ {g.name} {g.count>1 && <span>(+{g.count-1})</span>}</li>))}
          </ul>
        </section>

        {/* Suggestions flat */}
        <section className="section-card backdrop-blur p-6 rounded-2xl shadow-xl border-4 border-yellow-300">
          <h2 className="text-2xl font-bold mb-3">Suggestions to Bring</h2>
          <form onSubmit={addItem} className="flex gap-2 mb-4">
            <input value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="Add your own item (persists)" className="border p-2 rounded flex-1" />
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Add</button>
          </form>
          <ul className="space-y-2">
            {items.map((item)=>(
              <li key={item} className="flex items-center gap-2">
                <input type="checkbox" checked={!!claimed[item]} onChange={()=>toggle(item)} />
                <span className={claimed[item] ? 'line-through opacity-70' : ''}>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Allergies */}
        <section className="section-card backdrop-blur p-6 rounded-2xl shadow-xl border-4 border-red-300">
          <h2 className="text-2xl font-bold mb-3">I have an allergy! <span aria-hidden>🛟</span></h2>
          <p className="text-sm text-gray-700 mb-3">Share helpful info so the snack bar stays friendly. (Examples: “Peanuts”, “Dairy”, “Gluten”, “Gelatin”, “Food dye #40”.)</p>
          <form onSubmit={addAllergy} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input value={allergyName} onChange={e=>setAllergyName(e.target.value)} placeholder="Your name (optional)" className="border p-2 rounded" />
            <input value={allergyNote} onChange={e=>setAllergyNote(e.target.value)} placeholder="Allergy / note (required)" className="border p-2 rounded md:col-span-1" />
            <button className="bg-rose-600 hover:bg-rose-700 text-white p-2 rounded">Add allergy</button>
          </form>
          <ul className="space-y-1">
            {allergies.map((a,i)=>(
              <li key={i}>🛟 <strong>{a.name || 'Guest'}</strong>: {a.note}</li>
            ))}
          </ul>
        </section>

        <div className="text-center space-x-4">
          <Link href="/release" className="text-blue-600 underline">⚠️ Release of Liability</Link>
          <Link href="/admin" className="text-purple-700 underline font-semibold">Admin</Link>
        </div>
      </main>
    </div>
  )
}
