import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

export default function Admin() {
  // ---------- Login gate ----------
  const [tokenInput, setTokenInput] = useState('');
  const [token, setToken] = useState('');
  const [authed, setAuthed] = useState(false);
  const [gateError, setGateError] = useState('');

  useEffect(() => {
    const saved = sessionStorage.getItem('ADMIN_TOKEN') || '';
    if (saved) verifyToken(saved, { silent: true });
  }, []);

  async function verifyToken(value, { silent = false } = {}) {
    try {
      setGateError('');
      const res = await fetch('/.netlify/functions/rsvp?admin=1', {
        headers: { Authorization: `Bearer ${value}` },
      });
      if (!res.ok) throw new Error('Unauthorized');
      setAuthed(true);
      setToken(value);
      sessionStorage.setItem('ADMIN_TOKEN', value);
      await Promise.all([loadRSVPs(value), loadWaivers(value), loadAllergies(value)]);
    } catch {
      if (!silent) setGateError('Invalid admin token');
      setAuthed(false);
      setToken('');
      sessionStorage.removeItem('ADMIN_TOKEN');
    }
  }

  // ---------- RSVPs ----------
  const [rsvps, setRsvps] = useState([]);
  const [rsvpError, setRsvpError] = useState('');
  const [rsvpBusy, setRsvpBusy] = useState(false);

  async function loadRSVPs(tok = token) {
    try {
      setRsvpError('');
      const res = await fetch('/.netlify/functions/rsvp?admin=1', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error('auth');
      const data = await res.json();
      setRsvps(data.rows || []);
    } catch {
      setRsvpError('Could not load RSVPs (check admin token or functions).');
    }
  }

async function deleteRSVP(id) {
  if (!confirm('Delete this RSVP?')) return;
  const numericId = Number(id);                 // ensure number
  if (!Number.isFinite(numericId)) {
    alert('Bad id: ' + String(id));
    return;
  }
  setRsvpBusy(true);
  try {
    const res = await fetch(`/.netlify/functions/rsvp?id=${numericId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();              // read body either way
    if (!res.ok) {
      // show what the server actually returned (helps us debug)
      throw new Error(`HTTP ${res.status}: ${text || 'delete failed'}`);
    }
    await loadRSVPs();
  } catch (e) {
    setRsvpError('Delete failed: ' + e.message);
  } finally {
    setRsvpBusy(false);
  }
}


  const total = useMemo(() => rsvps.reduce((a, r) => a + (r.count || 1), 0), [rsvps]);

  async function downloadRSVPCsv() {
    const res = await fetch('/.netlify/functions/rsvp?format=csv&admin=1', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('CSV download failed (check token).');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'rsvps.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Waivers ----------
  const [waivers, setWaivers] = useState([]);
  const [waiverError, setWaiverError] = useState('');

  async function loadWaivers(tok = token) {
    try {
      setWaiverError('');
      const res = await fetch('/.netlify/functions/waivers', {
        headers: { Authorization: `Bearer ${tok}` },
      });
      if (!res.ok) throw new Error('auth');
      const data = await res.json();
      setWaivers(data.rows || []);
    } catch {
      setWaiverError('Could not load waivers (check admin token or functions).');
    }
  }

  async function downloadWaiverCsv() {
    const res = await fetch('/.netlify/functions/waivers?format=csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return alert('Waiver CSV download failed (check token).');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'waivers.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ---------- Allergies ----------
  const [allergies, setAllergies] = useState([]);
  const [aLoading, setALoading] = useState(false);
  const [aError, setAError] = useState('');

  async function loadAllergies() {
    try {
      setALoading(true); setAError('');
      const res = await fetch('/.netlify/functions/allergies');
      if (!res.ok) throw new Error('load');
      const data = await res.json();
      setAllergies(data.rows || []);
    } catch {
      setAError('Could not load allergies.');
    } finally {
      setALoading(false);
    }
  }

  async function deleteAllergy(id) {
    if (!confirm('Delete this allergy entry?')) return;
    try {
      const res = await fetch(`/.netlify/functions/allergies?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }, // unified header
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok !== true) throw new Error(data?.error || 'Delete failed');
      setAllergies(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      alert('Delete failed: ' + e.message);
    }
  }

  // ---------- Render ----------
  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Admin Login</h1>
            <Link href="/" className="underline text-blue-600">← Back</Link>
          </div>
          <p className="text-sm text-gray-600 mb-4">Enter the admin token to view the dashboard.</p>
          <input
            type="password"
            className="border p-2 rounded w-full mb-3"
            placeholder="Admin token"
            value={tokenInput}
            onChange={e => setTokenInput(e.target.value)}
          />
          {gateError && <p className="text-red-600 mb-3">{gateError}</p>}
          <button
            onClick={() => verifyToken(tokenInput)}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Unlock Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow p-6 space-y-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin — Caramel Apple / Pumpkin Art / Chaos</h1>
          <div className="flex items-center gap-3">
            <Link href="/" className="underline text-blue-600">← Back</Link>
            <button
              className="text-sm text-gray-600 underline"
              onClick={() => { setAuthed(false); setToken(''); sessionStorage.removeItem('ADMIN_TOKEN'); }}
            >
              Sign out
            </button>
          </div>
        </div>

        {/* RSVPs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">RSVPs</h2>
            <div className="flex gap-2">
              <button onClick={() => loadRSVPs()} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
              <button onClick={downloadRSVPCsv} className="bg-emerald-600 text-white px-4 py-2 rounded">Download CSV</button>
            </div>
          </div>
          {rsvpError && <p className="text-red-600 mb-3">{rsvpError}</p>}
          <table className="w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Count</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border w-24">Action</th>
              </tr>
            </thead>
            <tbody>
              {rsvps.map(r => (
                <tr key={r.id}>
                  <td className="p-2 border">{r.name}</td>
                  <td className="p-2 border text-center">{r.count}</td>
                  <td className="p-2 border">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 border text-center">
                    <button disabled={rsvpBusy} onClick={() => deleteRSVP(r.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                  </td>
                </tr>
              ))}
              {rsvps.length === 0 && <tr><td colSpan="4" className="p-2 text-center text-gray-600 italic">No RSVPs yet.</td></tr>}
            </tbody>
          </table>
          <p className="mt-4 font-semibold">Total people expected: {total}</p>
        </section>

        {/* Waiver Logs */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">Waiver Logs</h2>
            <div className="flex gap-2">
              <button onClick={() => loadWaivers()} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
              <button onClick={downloadWaiverCsv} className="bg-emerald-600 text-white px-4 py-2 rounded">Download CSV</button>
            </div>
          </div>
          {waiverError && <p className="text-red-600 mb-3">{waiverError}</p>}
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
              {waivers.map(w => (
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
              {waivers.length === 0 && <tr><td colSpan="7" className="p-2 text-center text-gray-600 italic">No waiver logs yet.</td></tr>}
            </tbody>
          </table>
        </section>

        {/* Allergies */}
        <section className="section-card p-4 border rounded">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-bold">Allergies</h2>
            <button onClick={loadAllergies} className="bg-blue-600 text-white px-4 py-2 rounded">Refresh</button>
          </div>
          {aError && <p className="text-red-600">{aError}</p>}
          {aLoading ? <p>Loading…</p> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2 border">When</th>
                  <th className="p-2 border">Name</th>
                  <th className="p-2 border">Note</th>
                  <th className="p-2 border w-24"></th>
                </tr>
              </thead>
              <tbody>
                {allergies.map(a => (
                  <tr key={a.id}>
                    <td className="p-2 border">{new Date(a.created_at).toLocaleString()}</td>
                    <td className="p-2 border">{a.name || 'Guest'}</td>
                    <td className="p-2 border">{a.note}</td>
                    <td className="p-2 border text-right">
                      <button onClick={() => deleteAllergy(a.id)} className="bg-red-600 text-white px-2 py-1 rounded">Delete</button>
                    </td>
                  </tr>
                ))}
                {allergies.length === 0 && <tr><td colSpan="4" className="p-2 text-center text-gray-600 italic">No allergies yet.</td></tr>}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
