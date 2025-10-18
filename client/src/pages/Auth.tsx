import { useState } from 'react'
import api from '../api'
import BackgroundAnimation from '../components/BackgroundAnimation'

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

type Props = { onLogin: () => void }

export default function Auth({ onLogin }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (mode: 'signup' | 'login') => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post(`/auth/${mode}`, { email, password })
      localStorage.setItem('sb_token', data.token)
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: mode === 'signup' ? 'Sign up successful' : 'Logged in' } }))
      onLogin()
    } catch (e: unknown) {
      const msg = (e as ApiError)?.response?.data?.error || 'Request failed'
      setError(msg)
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: msg } }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <BackgroundAnimation variant="auth" intensity="medium" />
      <div className="relative z-10 max-w-md w-full rounded-2xl bg-white/90 backdrop-blur shadow-sm ring-1 ring-slate-200 p-6 dark:bg-slate-900/90 dark:ring-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Sign up or log in to continue</p>
        </div>
        <div className="h-9 w-9 rounded-xl bg-blue-600/10 grid place-items-center dark:bg-blue-500/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600 dark:text-blue-400"><path d="M12 3l8 4-8 4-8-4 8-4zm8 7v6l-8 4-8-4V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        <input className="block w-full rounded-lg border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900/70 dark:text-slate-200 dark:border-slate-700" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="block w-full rounded-lg border-slate-300 bg-white/80 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-slate-900/70 dark:text-slate-200 dark:border-slate-700" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">{error}</div>}
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60" disabled={loading} onClick={() => submit('signup')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 6v12m-6-6h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {loading ? '...' : 'Sign Up'}
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-black disabled:opacity-60" disabled={loading} onClick={() => submit('login')}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {loading ? '...' : 'Log In'}
          </button>
        </div>
      </div>
      </div>
    </div>
  )
}
