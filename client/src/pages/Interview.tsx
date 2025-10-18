import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import { Card, SectionHeader, Pill, Button } from '../components/ui'
import BackgroundAnimation from '../components/BackgroundAnimation'
import { BookOpen, ExternalLink } from 'lucide-react'

interface InterviewInsights {
  avg_score: number;
  feedback: string;
  weak_topics?: string[];
  strength_topics?: string[];
  [key: string]: unknown;
}

interface RoadmapItem {
  week: number;
  milestone: string;
  tasks: string[];
  learning_resources?: Array<{
    title: string;
    url: string;
    type: string;
  }>;
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: {
    new(): SpeechRecognition;
  };
  webkitSpeechRecognition?: {
    new(): SpeechRecognition;
  };
}

interface ApiError {
  response?: {
    data?: {
      error?: string;
    };
  };
}

export default function Interview() {
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [listening, setListening] = useState(false)
  const [answer, setAnswer] = useState('')
  const [scores, setScores] = useState<{ score: number; feedback: string }[]>([])
  const [insights, setInsights] = useState<InterviewInsights>({} as InterviewInsights)
  const [focusSkills, setFocusSkills] = useState<string[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [usingResumeQuestions, setUsingResumeQuestions] = useState(false)
  const navigate = useNavigate()

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synth = useMemo(() => window.speechSynthesis, [])

  useEffect(() => {
    // Redirect to Auth if no token
    const token = localStorage.getItem('sb_token')
    if (!token) {
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'info', message: 'Please log in to continue' } }))
      navigate('/')
      return
    }
    // Do not auto-start; wait for user click
    setStatus('Click "Start Interview" to begin')
  }, [navigate])

  // Web Speech API setup
  useEffect(() => {
    const windowWithSR = window as WindowWithSpeechRecognition
    const SpeechRecognitionConstructor = windowWithSR.SpeechRecognition || windowWithSR.webkitSpeechRecognition
    if (SpeechRecognitionConstructor) {
      const rec = new SpeechRecognitionConstructor() as SpeechRecognition
      rec.lang = 'en-US'
      rec.interimResults = true
      rec.continuous = true
      rec.maxAlternatives = 1
      rec.onstart = () => {
        setListening(true)
        setStatus('Listening...')
      }
      rec.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map((r: SpeechRecognitionResult) => r[0]?.transcript || '')
          .join(' ')
        setAnswer(transcript)
      }
      rec.onerror = (e: SpeechRecognitionErrorEvent) => {
        setListening(false)
        setStatus(e?.error === 'not-allowed' ? 'Microphone permission denied' : 'Voice recognition error')
        window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: `Voice error: ${e?.error || 'unknown'}` } }))
      }
      rec.onend = () => {
        setListening(false)
        setStatus('Ready')
      }
      recognitionRef.current = rec
    }
  }, [])

  const speak = (text: string) => {
    try {
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 0.9
      utter.pitch = 1.1
      synth.cancel()
      synth.speak(utter)
    } catch (error) {
      console.error('Speech synthesis error:', error)
    }
  }

  const loadSavedResumeAnalysis = () => {
    try {
      const savedAnalysis = localStorage.getItem('skillbridge_resume_analysis')
      return savedAnalysis ? JSON.parse(savedAnalysis) : null
    } catch (error) {
      console.error('Error loading saved resume analysis:', error)
      return null
    }
  }

  const startInterview = async () => {
    try {
      // Ensure logged in
      const token = localStorage.getItem('sb_token')
      if (!token) {
        window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'info', message: 'Please log in to continue' } }))
        navigate('/')
        return
      }
      setBusy(true)
      setStatus('Starting interview...')
      const p = await api.get('/profile')
      const { targetRole, skills } = p.data || {}
      
      // Check for saved resume analysis data
      const resumeAnalysis = loadSavedResumeAnalysis()
      
      // Use detailed endpoint if resume analysis is available, otherwise use standard endpoint
      let data
      if (resumeAnalysis) {
        setStatus('Generating personalized questions from your resume...')
        const response = await api.post('/ai/interview/start-detailed', { 
          targetRole, 
          skills, 
          resumeAnalysis 
        })
        data = response.data
        setUsingResumeQuestions(true)
        window.dispatchEvent(new CustomEvent('sb:toast', { 
          detail: { 
            type: 'success', 
            message: 'Interview questions personalized based on your resume!' 
          } 
        }))
      } else {
        const response = await api.post('/ai/interview/start', { targetRole, skills })
        data = response.data
        setUsingResumeQuestions(false)
      }
      
      setQuestions(data.questions || [])
      setCurrentIdx(0)
      setScores([])
      setInsights({ targetRole, skills, weak_topics: [], strength_topics: [], avg_score: 0, feedback: '' })
      setFocusSkills([])
      setRoadmap([])
      setStatus('Ready')
      if (data.questions?.length) {
        speak(data.questions[0])
      }
    } catch (e: unknown) {
      setStatus((e as ApiError)?.response?.data?.error || 'Failed to start interview')
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Failed to start interview' } }))
    } finally {
      setBusy(false)
    }
  }

  const inferTopics = (q: string): string[] => {
    const lq = (q || '').toLowerCase()
    const topics: string[] = []
    if (lq.includes('react')) topics.push('React')
    if (lq.includes('node')) topics.push('Node.js')
    if (lq.includes('express')) topics.push('Express')
    if (lq.includes('mongo')) topics.push('MongoDB')
    if (lq.includes('docker')) topics.push('Docker')
    if (lq.includes('aws')) topics.push('AWS')
    if (lq.includes('tailwind')) topics.push('TailwindCSS')
    if (lq.includes('api') || lq.includes('rest')) topics.push('API')
    return topics.length ? topics : ['General']
  }

  const autoAnalyze = async (finalInsights?: InterviewInsights) => {
    try {
      setStatus('Analyzing interview and generating roadmap...')
      const p = await api.get('/profile')
      const gap = await api.post('/ai/skill-gap', { skills: p.data.skills || [], targetRole: p.data.targetRole || null })
      const missing = gap.data?.missing || []
      setFocusSkills(missing)
      const preferencesPayload = {
        pace: (p.data.preferences?.pace || 'balanced'),
        availability_hours: (p.data.preferences?.hoursPerWeek || 6),
        focus: (p.data.targetRole || '').toLowerCase().includes('frontend')
          ? ['frontend']
          : (p.data.targetRole || '').toLowerCase().includes('backend')
          ? ['backend']
          : (p.data.targetRole || '').toLowerCase().includes('full') && (p.data.targetRole || '').toLowerCase().includes('stack')
          ? ['frontend', 'backend']
          : (p.data.targetRole || '').toLowerCase().includes('ml')
          ? ['ml']
          : (p.data.targetRole || '').toLowerCase().includes('data') && (p.data.targetRole || '').toLowerCase().includes('scientist')
          ? ['ml']
          : [],
      }
      const rm = await api.post('/ai/roadmap', { missing, preferences: preferencesPayload, interview: finalInsights || insights })
      const newRoadmap = rm.data?.roadmap || []
      setRoadmap(newRoadmap)
      await api.post('/profile', { skills: p.data.skills || [], targetRole: p.data.targetRole || null, roadmap: newRoadmap, preferences: p.data.preferences || {}, interviewInsights: finalInsights || insights })
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: 'Analysis complete: focus skills and roadmap ready' } }))
      setStatus('Analysis complete. See focus skills and roadmap below')
    } catch {
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Auto-analysis failed' } }))
      setStatus('Auto-analysis failed')
    }
  }

  const startListening = async () => {
    if (!recognitionRef.current) {
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'info', message: 'Voice recognition not supported. Please type your answer.' } }))
      return
    }
    try {
      // Proactively request microphone permission; some browsers require a user gesture
      if (navigator?.mediaDevices?.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {})
      }
      setAnswer('')
      setStatus('Listening...')
      recognitionRef.current.start()
      setListening(true)
    } catch {
      setListening(false)
      setStatus('Voice recognition error')
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Failed to start voice recognition' } }))
    }
  }

  const stopListening = () => {
    try {
      recognitionRef.current?.stop()
      setStatus('Ready')
      setListening(false)
    } catch (error) {
      console.error('Error stopping speech recognition:', error)
    }
  }

  const submitAnswer = async () => {
    try {
      const question = questions[currentIdx] || ''
      if (!question) return
      setBusy(true)
      setStatus('Scoring...')
      const { data } = await api.post('/ai/interview/score', { question, answer })
      const nextScores = [...scores, { score: data.score, feedback: data.feedback }]
      setScores(nextScores)
      const topicKeys = inferTopics(question)
      const weakTopics = [...(insights.weak_topics || [])]
      const strengthTopics = [...(insights.strength_topics || [])]
      if (data.score < 50) {
        topicKeys.forEach(t => { if (!weakTopics.includes(t)) weakTopics.push(t) })
      } else if (data.score >= 70) {
        topicKeys.forEach(t => { if (!strengthTopics.includes(t)) strengthTopics.push(t) })
      }
      const avgScore = Math.round(nextScores.reduce((sum, s) => sum + (s.score || 0), 0) / nextScores.length)
      const updatedInsights = { ...insights, weak_topics: weakTopics, strength_topics: strengthTopics, avg_score: avgScore }
      setInsights(updatedInsights)
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: `Score: ${data.score}` } }))
      // Speak feedback
      speak(`Score ${data.score}. ${data.feedback}`)
      // Move to next question
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx(currentIdx + 1)
        setAnswer('')
        setStatus('Ready')
        speak(questions[currentIdx + 1])
      } else {
        setStatus('Interview completed')
        await autoAnalyze(updatedInsights)
      }
    } catch (e: unknown) {
      setStatus((e as ApiError)?.response?.data?.error || 'Failed to score answer')
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Failed to score answer' } }))
    } finally {
      setBusy(false)
    }
  }

  const resetInterview = () => {
    setScores([])
    setCurrentIdx(0)
    setAnswer('')
    setUsingResumeQuestions(false)
    if (questions.length) speak(questions[0])
    setStatus('Ready')
  }

  const saveInsights = async () => {
    try {
      const p = await api.get('/profile')
      const payload = { skills: p.data.skills || [], targetRole: p.data.targetRole || null, roadmap: p.data.roadmap || [], preferences: p.data.preferences || {}, interviewInsights: insights }
      await api.post('/profile', payload)
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: 'Interview insights saved' } }))
    } catch {
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Failed to save insights' } }))
    }
  }

  const generateRoadmapFromInterview = async () => {
    try {
      setBusy(true)
      setStatus('Generating roadmap from interview...')
      const p = await api.get('/profile')
      const gap = await api.post('/ai/skill-gap', { skills: p.data.skills || [], targetRole: p.data.targetRole || null })
      const preferencesPayload = {
        pace: (p.data.preferences?.pace || 'balanced'),
        availability_hours: (p.data.preferences?.hoursPerWeek || 6),
        focus: (p.data.targetRole || '').toLowerCase().includes('frontend')
          ? ['frontend']
          : (p.data.targetRole || '').toLowerCase().includes('backend')
          ? ['backend']
          : (p.data.targetRole || '').toLowerCase().includes('full') && (p.data.targetRole || '').toLowerCase().includes('stack')
          ? ['frontend', 'backend']
          : (p.data.targetRole || '').toLowerCase().includes('ml')
          ? ['ml']
          : (p.data.targetRole || '').toLowerCase().includes('data') && (p.data.targetRole || '').toLowerCase().includes('scientist')
          ? ['ml']
          : [],
      }
      const rm = await api.post('/ai/roadmap', { missing: gap.data.missing || [], preferences: preferencesPayload, interview: insights })
      const newRoadmap = rm.data.roadmap || []
      setRoadmap(newRoadmap) // <-- Update UI so the roadmap renders
      await api.post('/profile', { skills: p.data.skills || [], targetRole: p.data.targetRole || null, roadmap: newRoadmap, preferences: p.data.preferences || {}, interviewInsights: insights })
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'success', message: 'Roadmap generated from interview' } }))
      setStatus('Interview-based roadmap ready')
    } catch {
      setStatus('Failed to generate interview-based roadmap')
      window.dispatchEvent(new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Failed to generate interview-based roadmap' } }))
    } finally {
      setBusy(false)
    }
  }

  const currentQuestion = questions[currentIdx] || ''

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <BackgroundAnimation variant="interview" intensity="medium" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Voice Interview</h1>
          <p className="text-slate-600 dark:text-slate-400">Practice your technical interview skills with AI-powered questions</p>
        </div>
        
        <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <Pill label="Beta" color="purple" />
              {usingResumeQuestions && <Pill label="Resume-Based" color="green" />}
            </div>
            <Button variant="primary" onClick={startInterview} disabled={busy}>
              Start Interview
            </Button>
          </div>
          
          <div className="space-y-8">
            {/* Question Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Interview Question</h3>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed text-base">
                  {currentQuestion || 'No questions available. Ensure your profile is set.'}
                </p>
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-100 dark:border-green-800">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Your Answer</h3>
              </div>
              <textarea
                className="block w-full rounded-lg border-slate-300 bg-white dark:bg-slate-800 px-4 py-3 text-base shadow-sm focus:border-green-500 focus:ring-2 focus:ring-green-500/20 disabled:opacity-60 dark:text-slate-200 dark:border-slate-600 transition-all duration-200"
                rows={6}
                placeholder={listening ? '🎤 Listening...' : 'Speak or type your answer here...'}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={busy}
              />
              {/* Action Buttons */}
              <div className="mt-6 space-y-4">
                {/* Primary Actions */}
                <div className="flex gap-3">
                  <Button 
                    variant="primary" 
                    onClick={submitAnswer} 
                    disabled={!answer.trim() || busy}
                    className="flex-1 sm:flex-none"
                  >
                    Submit Answer
                  </Button>
                  <Button 
                    variant={listening ? "danger" : "secondary"} 
                    onClick={listening ? stopListening : startListening} 
                    disabled={busy}
                    className="flex-1 sm:flex-none"
                  >
                    {listening ? '⏹️ Stop Recording' : '🎤 Start Recording'}
                  </Button>
                </div>
                
                {/* Secondary Actions */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <Button variant="outline" onClick={resetInterview} disabled={busy} size="sm">
                    Reset
                  </Button>
                  <Button variant="outline" onClick={saveInsights} disabled={busy} size="sm">
                    Save Insights
                  </Button>
                  <Button variant="outline" onClick={generateRoadmapFromInterview} disabled={busy} size="sm">
                    Generate Roadmap
                  </Button>
                </div>
              </div>
            </div>
            {/* Status Message */}
            {status && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">System Status</div>
                    <div className="text-sm text-amber-700 dark:text-amber-300">{status}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {!!scores.length && (
          <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Interview Results</h2>
              <p className="text-slate-600 dark:text-slate-400">Your performance analysis and feedback</p>
            </div>
            <div className="space-y-4">
              {scores.map((s, i) => (
                <div key={i} className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-slate-900 dark:text-white">Question {i + 1}</span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">Score: {s.score}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">{s.feedback}</p>
                </div>
              ))}
              {!!insights?.avg_score && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800 text-center">
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Average Score: {insights.avg_score}</div>
                </div>
              )}
            </div>
          </Card>
        )}

        {!!focusSkills.length && (
          <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Focus Skills</h2>
              <p className="text-slate-600 dark:text-slate-400">Areas to concentrate on for improvement</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {focusSkills.map((s, i) => (
                <span key={i} className="inline-flex items-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2 text-sm font-medium text-white shadow-lg hover:shadow-xl transition-shadow">{s}</span>
              ))}
            </div>
          </Card>
        )}

        {!!roadmap.length && (
          <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm mt-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Learning Roadmap</h2>
              <p className="text-slate-600 dark:text-slate-400">Your personalized learning path based on the interview</p>
            </div>
          <div className="space-y-6">
            {roadmap.map((w: RoadmapItem, i: number) => (
              <div key={i} className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {w.week}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{w.milestone}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Week {w.week}</p>
                  </div>
                </div>
                
                {!!(w.tasks || []).length && (
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Tasks to Complete</h4>
                    <ul className="space-y-2">
                      {(w.tasks || []).map((t: string, ti: number) => (
                        <li key={ti} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Learning Resources */}
                {w.learning_resources && w.learning_resources.length > 0 && (
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800">
                    <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Learning Resources
                    </h4>
                    <div className="grid gap-2">
                      {w.learning_resources.map((resource, resourceIndex) => (
                        <a
                          key={resourceIndex}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-100 hover:underline transition-colors p-2 rounded bg-white/50 dark:bg-slate-800/50"
                        >
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium">{resource.title}</span>
                          <span className="text-xs bg-emerald-100 dark:bg-emerald-800 px-2 py-1 rounded-full">
                            {resource.type}
                          </span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      </div>
    </div>
  )
}