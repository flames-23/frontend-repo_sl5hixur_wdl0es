import { useEffect, useMemo, useState } from 'react'

const useBackend = () => {
  const baseUrl = useMemo(() => import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000', [])
  return {
    baseUrl,
    async get(path) {
      const r = await fetch(`${baseUrl}${path}`)
      if (!r.ok) throw new Error(`GET ${path} failed: ${r.status}`)
      return r.json()
    },
    async post(path, body) {
      const r = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      if (!r.ok) {
        let msg = await r.text().catch(()=>'')
        throw new Error(`POST ${path} failed: ${r.status} ${msg}`)
      }
      return r.json()
    }
  }
}

function Section({ title, subtitle, children }){
  return (
    <div className="bg-white/70 backdrop-blur border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Input({ label, ...props }){
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <input {...props} className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className||''}`} />
    </label>
  )
}

function Textarea({ label, ...props }){
  return (
    <label className="block mb-3">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      <textarea {...props} className={`w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${props.className||''}`} />
    </label>
  )
}

function Button({ children, ...props }){
  return (
    <button {...props} className={`inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-medium transition-colors disabled:opacity-50 ${props.className||''}`} />
  )
}

function TabNav({ current, setCurrent }){
  const tabs = [
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'generator', label: 'AI Generator' },
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'analytics', label: 'Analytics' },
  ]
  return (
    <div className="flex gap-2 mb-6">
      {tabs.map(t => (
        <button key={t.id} onClick={() => setCurrent(t.id)}
          className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${current===t.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

function App() {
  const { baseUrl, get, post } = useBackend()
  const [tab, setTab] = useState('onboarding')
  const [status, setStatus] = useState('')

  // Onboarding
  const [ws, setWs] = useState({ name: '', owner_email: '' })
  const [prospect, setProspect] = useState({ email: '', first_name: '', last_name: '', company: '', title: '' })

  // AI Generator
  const [gen, setGen] = useState({ product: '', audience: '', tone: 'friendly', call_to_action: 'Book a quick call?' })
  const [preview, setPreview] = useState(null)
  const [loadingGen, setLoadingGen] = useState(false)

  // Campaigns
  const [campaign, setCampaign] = useState({ name: '', workspace_id: '', sequence: [ { day_offset: 0, subject: '', body: '' } ]})
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  const addStep = () => {
    setCampaign(c => ({...c, sequence: [...c.sequence, { day_offset: (c.sequence.at(-1)?.day_offset ?? 0)+2, subject: '', body: '' }]}))
  }
  const removeStep = (idx) => {
    setCampaign(c => ({...c, sequence: c.sequence.filter((_,i)=>i!==idx)}))
  }

  const loadCampaigns = async () => {
    try {
      setLoadingCampaigns(true)
      const items = await get('/campaigns')
      setCampaigns(items)
    } catch (e) {
      setStatus(e.message)
    } finally {
      setLoadingCampaigns(false)
    }
  }

  useEffect(() => {
    // warm up backend and preload campaigns
    loadCampaigns()
  }, [])

  const submitWorkspace = async () => {
    try {
      setStatus('Creating workspace...')
      const r = await post('/workspaces', ws)
      setStatus(`Workspace created: ${r.id}`)
      setCampaign(c => ({...c, workspace_id: r.id}))
    } catch (e) { setStatus(e.message) }
  }

  const submitProspect = async () => {
    try {
      setStatus('Adding prospect...')
      const r = await post('/prospects', prospect)
      setStatus(`Prospect added: ${r.id}`)
    } catch (e) { setStatus(e.message) }
  }

  const generateEmail = async () => {
    try {
      setLoadingGen(true)
      setStatus('Generating email...')
      const r = await post('/generate', gen)
      setPreview(r)
      setStatus('Generated!')
    } catch (e) { setStatus(e.message) }
    finally { setLoadingGen(false) }
  }

  const submitCampaign = async () => {
    try {
      setStatus('Creating campaign...')
      const r = await post('/campaigns', campaign)
      setStatus(`Campaign created: ${r.id}`)
      await loadCampaigns()
    } catch (e) { setStatus(e.message) }
  }

  const trackEvent = async (type) => {
    try {
      await post('/events', { type, properties: { page: 'dashboard' } })
      setStatus(`Tracked ${type}`)
    } catch (e) { setStatus(e.message) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-teal-50">
      <header className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-teal-600">Cold Outreach Studio</h1>
          <p className="text-sm text-gray-600">AI-powered cold email automation starter</p>
        </div>
        <div className="text-xs text-gray-500">Backend: {baseUrl}</div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-16">
        <TabNav current={tab} setCurrent={setTab} />

        {status && (
          <div className="mb-6 p-3 rounded-lg border text-sm bg-white/70">
            {status}
          </div>
        )}

        {tab === 'onboarding' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Create workspace" subtitle="Base container for campaigns and team settings.">
              <Input label="Workspace name" value={ws.name} onChange={e=>setWs({...ws, name:e.target.value})} placeholder="Acme Outreach" />
              <Input label="Owner email" value={ws.owner_email} onChange={e=>setWs({...ws, owner_email:e.target.value})} placeholder="owner@acme.com" />
              <Button onClick={submitWorkspace}>Create workspace</Button>
            </Section>

            <Section title="Add a prospect" subtitle="Seed your list with a contact to reach.">
              <Input label="Email" value={prospect.email} onChange={e=>setProspect({...prospect, email:e.target.value})} placeholder="prospect@company.com" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="First name" value={prospect.first_name} onChange={e=>setProspect({...prospect, first_name:e.target.value})} />
                <Input label="Last name" value={prospect.last_name} onChange={e=>setProspect({...prospect, last_name:e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Company" value={prospect.company} onChange={e=>setProspect({...prospect, company:e.target.value})} />
                <Input label="Title" value={prospect.title} onChange={e=>setProspect({...prospect, title:e.target.value})} />
              </div>
              <Button onClick={submitProspect}>Add prospect</Button>
            </Section>
          </div>
        )}

        {tab === 'generator' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Describe your pitch" subtitle="We craft a subject and email body for your audience.">
              <Input label="Product" value={gen.product} onChange={e=>setGen({...gen, product:e.target.value})} placeholder="AI sequence automation for SDRs" />
              <Input label="Audience" value={gen.audience} onChange={e=>setGen({...gen, audience:e.target.value})} placeholder="B2B SaaS founders" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tone" value={gen.tone} onChange={e=>setGen({...gen, tone:e.target.value})} />
                <Input label="Call to action" value={gen.call_to_action} onChange={e=>setGen({...gen, call_to_action:e.target.value})} />
              </div>
              <Button onClick={generateEmail} disabled={loadingGen}>{loadingGen ? 'Generating...' : 'Generate'}</Button>
              <p className="text-xs text-gray-500 mt-2">Tip: Set an OPENAI_API_KEY to use GPT, otherwise a template is used.</p>
            </Section>

            <Section title="Preview">
              {preview ? (
                <div>
                  <h4 className="font-semibold mb-2">Subject</h4>
                  <p className="p-3 bg-white border rounded mb-4">{preview.subject}</p>
                  <h4 className="font-semibold mb-2">Body</h4>
                  <pre className="p-3 bg-white border rounded whitespace-pre-wrap">{preview.body}</pre>
                </div>
              ) : (
                <p className="text-gray-500">No preview yet. Generate to see suggestions.</p>
              )}
            </Section>
          </div>
        )}

        {tab === 'campaigns' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Create campaign" subtitle="Attach to a workspace and add sequence steps.">
              <Input label="Campaign name" value={campaign.name} onChange={e=>setCampaign({...campaign, name:e.target.value})} placeholder="June Outreach" />
              <Input label="Workspace ID" value={campaign.workspace_id} onChange={e=>setCampaign({...campaign, workspace_id:e.target.value})} placeholder="(from onboarding)" />
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Sequence</h4>
                  <Button className="!bg-gray-800 hover:!bg-black" onClick={addStep}>Add step</Button>
                </div>
                <div className="space-y-4">
                  {campaign.sequence.map((s, idx) => (
                    <div key={idx} className="rounded border p-3 bg-white">
                      <div className="flex items-center gap-3">
                        <Input label={`Day offset`} type="number" value={s.day_offset}
                          onChange={e=>{
                            const val = Number(e.target.value)
                            setCampaign(c=>{ const seq=[...c.sequence]; seq[idx] = {...seq[idx], day_offset: val}; return {...c, sequence: seq} })
                          }} />
                        <button onClick={()=>removeStep(idx)} className="self-end text-red-600 text-sm">Remove</button>
                      </div>
                      <Input label="Subject" value={s.subject} onChange={e=>{
                        const val=e.target.value; setCampaign(c=>{ const seq=[...c.sequence]; seq[idx] = {...seq[idx], subject: val}; return {...c, sequence: seq} })
                      }} />
                      <Textarea rows={4} label="Body" value={s.body} onChange={e=>{
                        const val=e.target.value; setCampaign(c=>{ const seq=[...c.sequence]; seq[idx] = {...seq[idx], body: val}; return {...c, sequence: seq} })
                      }} />
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={submitCampaign}>Create campaign</Button>
            </Section>

            <Section title="Your campaigns" subtitle="Latest entries listed below.">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-500">{loadingCampaigns ? 'Loading...' : `${campaigns.length} campaign(s)`}</div>
                <Button className="!bg-gray-800 hover:!bg-black" onClick={loadCampaigns}>Refresh</Button>
              </div>
              <div className="divide-y border rounded bg-white">
                {campaigns.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">No campaigns yet.</div>
                )}
                {campaigns.map(c => (
                  <div key={c._id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-xs text-gray-500">Workspace: {c.workspace_id}</div>
                      </div>
                      <div className="text-xs text-gray-500">Steps: {c.sequence?.length || 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {tab === 'analytics' && (
          <div className="grid md:grid-cols-2 gap-6">
            <Section title="Quick actions" subtitle="Fire demo events to simulate tracking.">
              <div className="flex gap-3">
                <Button onClick={()=>trackEvent('campaign_viewed')}>Campaign viewed</Button>
                <Button onClick={()=>trackEvent('email_sent')}>Email sent</Button>
                <Button onClick={()=>trackEvent('reply_received')}>Reply received</Button>
              </div>
            </Section>
            <Section title="What we track" subtitle="Events are stored server-side for analysis.">
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Campaign lifecycle (created, updated)</li>
                <li>Email delivery events (sent, opened, clicked)</li>
                <li>Replies and meeting bookings</li>
              </ul>
              <p className="text-xs text-gray-500 mt-3">Hook this up to your BI later.</p>
            </Section>
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs text-gray-500">
        Built as a starter. Extend with auth (Clerk), email (Resend), payments (Stripe), and scheduling.
      </footer>
    </div>
  )
}

export default App
