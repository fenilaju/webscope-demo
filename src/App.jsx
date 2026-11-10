import React, { useEffect, useState } from 'react';
import { ArrowRight, Globe2, LockKeyhole, LogOut, MessageSquareText, Sparkles } from 'lucide-react';
import { supabase } from './lib/supabase.js';
import { retrieveChunks } from './lib/retrieve.js';

const demoDocument = `Webscope is a small website intelligence workspace. Users can register with an email and password, then sign in to access its tools. The website summary tool reads the public text of a URL and uses an AI model to create a concise overview and key points. Some websites prevent automated reading, so a summary may not be available for every URL. The document question-answer tool is a retrieval augmented generation demo. It splits pasted text into short passages, finds passages that match a question, and asks an AI model to answer from those passages. This keeps the answer grounded in the provided text. The demo uses Supabase authentication, a server-side Gemini API call, and a React interface. Keep secret API keys in deployment environment variables. Never commit API keys to GitHub.`;

async function callApi(path, payload) {
  const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed.');
  return data;
}

function Auth({ onDone }) {
  const [register, setRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      const result = register
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (register && !result.data.session) setMessage('Check your inbox to confirm your email, then sign in.');
      else onDone(result.data.session?.user ?? result.data.user);
    } catch (error) { setMessage(error.message || 'Could not connect. Check your Supabase setup.'); }
    finally { setBusy(false); }
  }

  return <main className="auth-wrap"><div className="auth-card">
    <div className="brand"><span className="brand-mark"><Globe2 size={19}/></span> webscope</div>
    <p className="eyebrow">YOUR WEB, IN FOCUS</p><h1>{register ? 'Create your account' : 'Welcome back'}</h1>
    <p className="muted">{register ? 'Sign up to try the website intelligence demo.' : 'Sign in to open your workspace.'}</p>
    <form onSubmit={submit} className="auth-form">
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label>Password<input type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength="6" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters"/></label>
      <button className="primary full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'} <ArrowRight size={16}/></button>
    </form>
    {message && <p className="notice">{message}</p>}
    <p className="switch-auth">{register ? 'Already registered?' : 'New to Webscope?'} <button onClick={() => { setRegister(!register); setMessage(''); }}>{register ? 'Sign in' : 'Create an account'}</button></p>
    <p className="setup-hint"><LockKeyhole size={14}/> Authentication is handled securely by Supabase.</p>
  </div></main>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('summary');
  const [site, setSite] = useState('https://example.com');
  const [siteSummary, setSiteSummary] = useState(null);
  const [doc, setDoc] = useState(demoDocument);
  const [question, setQuestion] = useState('How does the question-answer demo work?');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  async function summarize(event) {
    event.preventDefault(); setBusy(true); setError(''); setSiteSummary(null);
    try {
      const page = await callApi('/api/summarize', { url: site });
      const result = await callApi('/api/generate', { mode: 'summarize', question: '', context: `Title: ${page.title}\nURL: ${page.sourceUrl}\n\n${page.text}` });
      setSiteSummary({ ...page, answer: result.answer });
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function ask(event) {
    event.preventDefault(); setBusy(true); setError(''); setAnswer('');
    try {
      const passages = retrieveChunks(doc, question);
      if (!passages.length) throw new Error('No matching passages found. Add more document text or ask about a topic in it.');
      const result = await callApi('/api/generate', { mode: 'rag', question, context: passages.join('\n\n') });
      setAnswer(result.answer);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  async function signOut() { await supabase?.auth.signOut(); setUser(null); }

  if (!ready) return <div className="loading">Opening your workspace…</div>;
  if (!supabase) return <main className="auth-wrap"><div className="auth-card"><div className="brand"><span className="brand-mark"><Globe2 size={19}/></span> webscope</div><h1>One setup step left</h1><p className="muted">Add your Supabase project URL and publishable key to a local <code>.env</code> file. See the README for setup steps.</p><p className="setup-hint"><LockKeyhole size={14}/> The demo fails closed until authentication is configured.</p></div></main>;
  if (!user) return <Auth onDone={setUser}/>;

  return <div className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark"><Globe2 size={19}/></span> webscope</div><div className="side-label">WORKSPACE</div>
      <button className={`nav-item ${tab === 'summary' ? 'selected' : ''}`} onClick={() => { setTab('summary'); setError(''); }}><Sparkles size={17}/> Site summary</button>
      <button className={`nav-item ${tab === 'rag' ? 'selected' : ''}`} onClick={() => { setTab('rag'); setError(''); }}><MessageSquareText size={17}/> Ask your document</button>
      <div className="sidebar-bottom"><div className="user-chip"><span className="avatar">{user.email?.[0]?.toUpperCase()}</span><span className="user-email">{user.email}</span><button className="icon-btn" onClick={signOut} title="Sign out"><LogOut size={16}/></button></div><p>Free demo workspace</p></div>
    </aside>
    <main className="main-area"><header className="topbar"><span>Workspace <span className="slash">/</span> {tab === 'summary' ? 'Site summary' : 'Ask your document'}</span><span className="status"><i/> All systems ready</span></header>
      <section className="content"><div className="page-heading"><div><p className="eyebrow">{tab === 'summary' ? 'WEB RESEARCH' : 'RETRIEVAL AUGMENTED GENERATION'}</p><h1>{tab === 'summary' ? 'Understand any website.' : 'Ask your document.'}</h1><p className="muted">{tab === 'summary' ? 'Enter a public URL and get the important points in seconds.' : 'Ask a question and get an answer grounded in your source text.'}</p></div><div className="heading-icon">{tab === 'summary' ? <Globe2/> : <MessageSquareText/>}</div></div>
        {tab === 'summary' ? <><form className="url-form panel" onSubmit={summarize}><div className="field-label">WEBSITE ADDRESS</div><div className="input-row"><Globe2 size={18}/><input type="url" required value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://example.com"/><button className="primary" disabled={busy}>{busy ? 'Reading…' : 'Summarize'} <ArrowRight size={16}/></button></div><p className="field-help">Public pages only. Sites that block automated access may not work.</p></form>
          {siteSummary && <article className="result-card"><div className="result-top"><div><span className="result-label">AI SUMMARY</span><h2>{siteSummary.title}</h2></div><a href={siteSummary.sourceUrl} target="_blank" rel="noreferrer">Open source ↗</a></div><div className="answer-text">{siteSummary.answer}</div><p className="source-note">Generated from text fetched from this page.</p></article>}
        </> : <><div className="panel doc-panel"><div className="panel-heading"><div><div className="field-label">SOURCE TEXT</div><p className="field-help">Paste notes, a short article, or use the sample below.</p></div><button className="text-btn" onClick={() => setDoc(demoDocument)}>Load sample</button></div><textarea value={doc} onChange={(e) => setDoc(e.target.value)} rows={7} placeholder="Paste the document text to search…"/></div>
          <form className="panel question-panel" onSubmit={ask}><div className="field-label">YOUR QUESTION</div><div className="input-row"><MessageSquareText size={18}/><input value={question} onChange={(e) => setQuestion(e.target.value)} required placeholder="Ask something about the text"/><button className="primary" disabled={busy || !doc.trim()}>{busy ? 'Thinking…' : 'Ask question'} <ArrowRight size={16}/></button></div></form>
          {answer && <article className="result-card"><span className="result-label">ANSWER</span><div className="answer-text">{answer}</div><p className="source-note">Retrieved passages from your document were sent to the AI.</p></article>}
        </>}
        {error && <div className="error-box">{error}</div>}
        <div className="privacy-note"><LockKeyhole size={15}/><span>Your Gemini key stays on the server. Text you submit is sent to the AI provider to generate a response.</span></div>
      </section>
    </main>
  </div>;
}
