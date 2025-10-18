import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
// add location for auth state tracking
import { useLocation } from 'react-router-dom'
import './App.css'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Interview from './pages/Interview'
import ResumeAnalysis from './pages/ResumeAnalysis'
import HabitTracker from './pages/HabitTracker'
import { Button } from './components/ui'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isDark, setIsDark] = useState(false)
  const [authed, setAuthed] = useState<boolean>(false)
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'info' | 'success' | 'error' }[]>([])

  useEffect(() => {
    // Initialize theme from localStorage
    const stored = localStorage.getItem('theme')
    const preferDark = stored ? stored === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(preferDark)
    document.documentElement.classList.toggle('dark', preferDark)

    // Initialize auth state
    setAuthed(!!localStorage.getItem('sb_token'))
  }, [])

  useEffect(() => {
    // Update auth state on route changes (after login or logout)
    setAuthed(!!localStorage.getItem('sb_token'))
  }, [location])

  // Function to handle successful login
  const handleLogin = () => {
    setAuthed(true)
    navigate('/dashboard')
  }

  useEffect(() => {
    // Toast event listener
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent).detail || {}
      const id = Date.now() + Math.random()
      const type: 'info' | 'success' | 'error' = detail.type || 'info'
      const message: string = detail.message || ''
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 3000)
    }
    window.addEventListener('sb:toast', onToast as EventListener)
    return () => window.removeEventListener('sb:toast', onToast as EventListener)
  }, [])

const toggleTheme = () => {
  const next = !isDark
  setIsDark(next)
  document.documentElement.classList.toggle('dark', next)
  localStorage.setItem('theme', next ? 'dark' : 'light')
}

const logout = () => {
  localStorage.removeItem('sb_token')
  setAuthed(false)
  window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: 'Logged out' } }))
  navigate('/')
}

return (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-gray-900 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 dark:text-slate-100">
    <header className="bg-white/80 backdrop-blur-md shadow-lg border-b border-slate-200/60 dark:bg-slate-900/80 dark:border-slate-700/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold text-gradient">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-8 w-8"><path d="M9.5 2A7.5 7.5 0 0 0 4 10c0 6 3.5 10 3.5 10s3.5-4 3.5-10a7.5 7.5 0 0 0-5.5-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>SkillBridge</span>
            </Link>
            {authed && (
              <nav className="hidden md:flex space-x-1">
                <Link className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80" to="/dashboard">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 22V12h6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Dashboard
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80" to="/resume-analysis">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Resume Analysis
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80" to="/interview">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Interview
                </Link>
                <Link className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 transition-all duration-200 dark:text-slate-200 dark:hover:text-white dark:hover:bg-slate-800/80" to="/habit-tracker">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Habits
                </Link>
              </nav>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              ariaLabel="Toggle theme"
              className="rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-800/80"
            >
              {isDark ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364l-1.414-1.414M7.05 7.05L5.636 5.636m12.728 0l-1.414 1.414M7.05 16.95l-1.414 1.414" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              )}
            </Button>
            {authed && (
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={logout} 
                ariaLabel="Logout"
                className="btn-modern btn-secondary"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-4 w-4 mr-2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Logout
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
    <main className="max-w-6xl mx-auto px-6 py-8 grid gap-8">
      <div className="grid gap-6">
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 p-6 dark:bg-slate-900 dark:ring-slate-800">
          <Routes>
            <Route path="/" element={authed ? <Dashboard /> : <Auth onLogin={handleLogin} />} />
            <Route path="/dashboard" element={authed ? <Dashboard /> : <Auth onLogin={handleLogin} />} />
            <Route path="/interview" element={authed ? <Interview /> : <Auth onLogin={handleLogin} />} />
            <Route path="/resume-analysis" element={authed ? <ResumeAnalysis /> : <Auth onLogin={handleLogin} />} />
            <Route path="/habit-tracker" element={authed ? <HabitTracker /> : <Auth onLogin={handleLogin} />} />
          </Routes>
        </div>
      </div>
    </main>
    <footer className="border-t border-slate-200 mt-8 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-6 py-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Built by team MAP
      </div>
    </footer>

    {/* Toast container */}
    <div className="fixed top-4 right-4 z-50 grid gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-lg px-4 py-2 text-sm shadow ring-1 transition-colors ${t.type === 'success' ? 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-900/30 dark:text-green-200 dark:ring-green-800' : t.type === 'error' ? 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/30 dark:text-red-200 dark:ring-red-800' : 'bg-slate-50 text-slate-800 ring-slate-200 dark:bg-slate-900/50 dark:text-slate-200 dark:ring-slate-800'}`}>{t.message}</div>
      ))}
    </div>
    </div>
  )
}

export default App
