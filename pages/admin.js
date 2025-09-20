import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function Admin(){
  // RSVPs state
  const [token, setToken] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // Allergies state
  const [adminToken, setAdminToken] = useState('')
  const [allergies, setAllergies] = useState([])
  const [aLoading, setALoading] = useState(false)
  const [aError, setAError] = useState('')

  // Load RSVPs
  async function load(){
    try{
      setError('')
      const res = await fetch('/.netlify/functions/rsvp?admin=1', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if(!res.ok) throw new Error('auth')
      const data = await res.json()
      setRows(data.rows || [])
    }catch(e){
      setError('Could not load (check admin token or functions)')
    }
  }

  useEffect(()=>{ if(token) load() }, [token])

  async function del(id){
    if(!confirm('Delete this RSVP?')) return
    setBusy(true)
    try{
      const res = await fetch('/.netlify/functions/rsvp', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ id })
      })
      if(!res.ok) throw new Error('delete failed')
      await load()
    }catch(e){
      setError('Delete failed (check token)')
    }finally{
      setBusy(false)
    }
  }

  const total = useMemo(()=>rows.reduce((a,r)=>a + (r.count||1),0),[rows])

  async function downloadCSV(){
    const res = await fetch('/.netlify/functions/rsvp?format=csv&admin=1', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if(!res.ok){ alert('CSV download failed (check token)'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rsvps.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Load Allergies
  async function loadAllergies() {
    try {
      setALoading(true); setAError('');
      const res = await fetch('/.netlify/functions/allergies');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAllergies(data.rows || []);
    } catch (e) {
      setAError('Could not load allergies');
    } finally {
      setALoading(false);
    }
  }

  async function deleteAllergy(id) {
    if (!adminToken) { alert('Enter admin token'); return; }
    if (!confirm('Delete this allergy entry?')) return;
    try {
      const res = await fetch(`/.netlify/functions/allergies?id=${id}`, {
        method: 'DELETE',
        headers: { 'x-admin-token': adminToken },
      });
      const data = await res.json();
      if (!res.ok || data?.ok !== true) throw new Error(data?.error || 'Delete failed');
      setAllergies(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  // Render
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-6 space-y-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Admin — Caramel Apple / Pumpkin Art / Chaos</h1>
          <Link href="/" className="underline text-blue-600">← Back to site</Link>
        </div>

        {/* RSVPs Section */}
        <section>
          <label className="block mb-4">
            <span className="text-sm font-medium">RSVP Admin Token (Netlify env: ADMIN_TOKEN)</span>
            <input type="password" className="border p-2 rounded w-full"
              value={token} onChange={e=>setToken(e.target.value)}
              placeholder="Paste token to unlock" />
          </label>

          <div className="flex gap-2 mb-4">
            <button onClick={load} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
            <button className="bg-emerald-600 text-white px-4 py-2 rounded" onClick={downloadCSV}>Download CSV</button>
          </div>

          {error && <p className="text-red-600 mb-3">{error}</p>}

          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Count</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="p-2 border">{r.name}</td>
                  <td className="p-2 border text-center">{r.count}</td>
                  <td className="p-2 border">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 border text-center">
                    <button disabled={busy} onClick={()=>del(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 font-semibold">Total people expected: {total}</p>
        </section>

        {/* Allergies Section */}
        <section className="section-card p-4 border rounded">
          <h2 className="text-xl font-bold mb-2">Allergies (Admin)</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="password"
              placeholder="Admin token"
              value={adminToken}
              onChange={e=>setAdminToken(e.target.value)}
              className="border p-2 rounded"
            />
            <button onClick={loadAllergies} className="bg-blue-600 text-white px-3 py-2 rounded">Refresh</button>
          </div>
          {aError && <p className="text-red-600">{aError}</p>}
          {aLoading ? <p>Loading…</p> : (
            <table className="w-full text-sm">
              <thead><tr><th className="text-left">When</th><th className="text-left">Name</th><th className="text-left">Note</th><th></th></tr></thead>
              <tbody>
                {allergies.map(a=>(
                  <tr key={a.id}>
                    <td>{new Date(a.created_at).toLocaleString()}</td>
                    <td>{a.name || 'Guest'}</td>
                    <td>{a.note}</td>
                    <td className="text-right">
                      <button onClick={()=>deleteAllergy(a.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                    </td>
                  </tr>
                ))}
                {allergies.length===0 && <tr><td colSpan="4" className="italic text-gray-600">No allergies yet.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
