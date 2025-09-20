import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function Admin(){
  // ---- RSVPs ----
  const [token, setToken] = useState('')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadRSVPs(){
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
  useEffect(()=>{ if(token) loadRSVPs() }, [token])

  async function delRSVP(id){
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
      await loadRSVPs()
    }catch(e){
      setError('Delete failed (check token)')
    }finally{
      setBusy(false)
    }
  }

  const total = useMemo(()=>rows.reduce((a,r)=>a + (r.count||1),0),[rows])

  async function downloadRSVPsCSV(){
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

  // ---- Waiver Logs ----
  const [wRows, setWRows] = useState([])
  const [wError, setWError] = useState('')

  async function loadWaivers(){
    try{
      setWError('')
      const res = await fetch('/.netlify/functions/waivers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if(!res.ok) throw new Error('auth')
      const data = await res.json()
      setWRows(data.rows || [])
    }catch(e){
      setWError('Could not load waivers (check admin token or functions)')
    }
  }

  async function downloadWaiversCSV(){
    const res = await fetch('/.netlify/functions/waivers?format=csv', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if(!res.ok){ alert('Waiver CSV download failed (check token)'); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'waivers.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ---- Allergies ----
  const [adminToken, setAdminToken] = useState('')  // separate header for allergies delete
  const [allergies, setAllergies] = useState([])
  const [aLoading, setALoading] = useState(false)
  const [aError, setAError] = useState('')

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

  // ---- Render ----
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6 space-y-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Admin — Caramel Apple / Pumpkin Art / Chaos</h1>
          <Link href="/" className="underline text-blue-600">← Back to site</Link>
        </div>

        {/* Shared admin token for RSVPs + Waivers */}
        <label className="block mb-4">
          <span className="text-sm font-medium">Admin Token (Netlify env: ADMIN_TOKEN)</span>
          <input type="password" className="border p-2 rounded w-full" value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste token to unlock" />
        </label>

        {/* RSVPs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">RSVPs</h2>
            <div className="flex gap-2">
              <button onClick={loadRSVPs} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
              <button onClick={downloadRSVPsCSV} className="bg-emerald-600 text-white px-4 py-2 rounded">Download CSV</button>
            </div>
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
                    <button disabled={busy} onClick={()=>delRSVP(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="mt-4 font-semibold">Total people expected: {total}</p>
        </section>

        {/* Waiver Logs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">Waiver Logs</h2>
            <div className="flex gap-2">
              <button onClick={loadWaivers} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
              <button onClick={downloadWaiversCSV} className="bg-emerald-600 text-white px-4 py-2 rounded">Download CSV</button>
            </div>
          </div>

          {wError && <p className="text-red-600 mb-3">{wError}</p>}

          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">When</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Method</th>
                <th className="p-2 border">Version</th>
                <th className="p-2 border">IP</th>
                <th className="p-2 border">User Agent</th>
              </tr>
            </thead>
            <tbody>
              {wRows.map(w=>(
                <tr key={w.id}>
                  <td className="p-2 border">{new Date(w.agreed_at).toLocaleString()}</td>
                  <td className="p-2 border">{w.name}</td>
                  <td className="p-2 border">{w.email || w.contact || ''}</td>
                  <td className="p-2 border">{w.method || 'checkbox'}</td>
                  <td className="p-2 border">{w.waiver_version || 'v8'}</td>
                  <td className="p-2 border">{w.ip_address || ''}</td>
                  <td className="p-2 border" style={{maxWidth: 280, overflowWrap: 'anywhere'}}>{w.user_agent || ''}</td>
                </tr>
              ))}
              {wRows.length===0 && (
                <tr><td colSpan="7" className="p-2 border text-center text-gray-600 italic">No waiver logs yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Allergies */}
        <section className="section-card p-4 border rounded">
          <h2 className="text-xl font-bold mb-2">Allergies (Admin)</h2>
          <div className="flex gap-2 mb-3">
            <input
              type="password"
              placeholder="Admin token (for deletes)"
              value={adminToken}
              onChange={e=>setAdminToken(e.target.value)}
              className="border p-2 rounded"
            />
            <button onClick={loadAllergies} className="bg-blue-600 text-white px-3 py-2 rounded">Refresh</button>
          </div>
          {aError && <p className="text-red-600">{aError}</p>}
          {aLoading ? <p>Loading…</p> : (
            <table className="w-full text-sm">
              <thead><tr><th className="text-left p-2 border">When</th><th className="text-left p-2 border">Name</th><th className="text-left p-2 border">Note</th><th className="p-2 border w-24"></th></tr></thead>
              <tbody>
                {allergies.map(a=>(
                  <tr key={a.id}>
                    <td className="p-2 border">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-2 border">{a.name || 'Guest'}</td>
                    <td className="p-2 border">{a.note}</td>
                    <td className="p-2 border text-right">
                      <button onClick={()=>deleteAllergy(a.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                    </td>
                  </tr>
                ))}
                {allergies.length===0 && <tr><td colSpan="4" className="italic text-gray-600 p-2 border">No allergies yet.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
