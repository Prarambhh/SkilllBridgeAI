import { useEffect, useState, useRef } from 'react'
import api from '../api'
import { useNavigate } from 'react-router-dom'
import { Card, SectionHeader, Pill, Button } from '../components/ui'
import BackgroundAnimation from '../components/BackgroundAnimation'
import { 
  Target, 
  TrendingUp, 
  BookOpen, 
  Clock, 
  CheckCircle, 
  X, 
  Search,
  Zap,
  Brain,
  Trophy,
  Calendar,
  ArrowRight,
  ChevronDown,
  ExternalLink
} from 'lucide-react'
import { toast } from 'react-hot-toast'

interface InterviewInsights {
  [key: string]: unknown
}

interface Preferences {
  pace: 'light' | 'balanced' | 'intense'
  style: 'project' | 'theory' | 'mixed'
  hoursPerWeek: number
}

interface RoadmapItem {
  week: number
  milestone: string
  tasks: string[]
  learning_resources?: Array<{
    title: string
    url: string
    type: string
  }>
}

export default function Dashboard() {
  const [skills, setSkills] = useState<string[]>([])
  const [jobs, setJobs] = useState<string[]>([])
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])
  const [targetRole, setTargetRole] = useState('')
  const [missing, setMissing] = useState<string[]>([])
  const [roadmap, setRoadmap] = useState<RoadmapItem[]>([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [preferences, setPreferences] = useState<Preferences>({ pace: 'balanced', style: 'mixed', hoursPerWeek: 6 })
  const [interviewInsights, setInterviewInsights] = useState<InterviewInsights>({})
  const [skillQuery, setSkillQuery] = useState('')
  const [skillsOpen, setSkillsOpen] = useState(false)
  const navigate = useNavigate()
  const skillsDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Redirect to Auth if no token
    const token = localStorage.getItem('sb_token')
    if (!token) {
      toast.error('Please log in to continue')
      navigate('/')
      return
    }
    const load = async () => {
      try {
        const s = await api.get('/meta/skills')
        const j = await api.get('/meta/jobs')
        setSkills(s.data.skills || [])
        setJobs(j.data.jobs || [])
        // Try to load saved profile
        const p = await api.get('/profile')
        if (p.data) {
          setSelectedSkills(p.data.skills || [])
          setTargetRole(p.data.targetRole || '')
          setRoadmap(p.data.roadmap || [])
          setPreferences(p.data.preferences || { pace: 'balanced', style: 'mixed', hoursPerWeek: 6 })
          setInterviewInsights(p.data.interviewInsights || {})
          // Restore missing skills for roadmap display continuity
          if (p.data.roadmap?.length) {
            setMissing(p.data.roadmap.map((r: RoadmapItem) => r.milestone.replace('Learn ', '')))
          }
        }
      } catch {
        // ignore 401 from /profile if not logged in
      }
    }
    load()
  }, [navigate])

  // Handle clicking outside skills dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(event.target as Node)) {
        setSkillsOpen(false)
      }
    }

    if (skillsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [skillsOpen])

  const filteredSkills = skills.filter(
    (s) => s.toLowerCase().includes(skillQuery.toLowerCase()) && !selectedSkills.includes(s)
  )
  const addSkill = (s: string) => {
    setSelectedSkills((prev) => [...prev, s])
    setSkillQuery('')
  }
  const removeSkill = (s: string) => setSelectedSkills((prev) => prev.filter((v) => v !== s))

  const saveProfile = async () => {
    try {
      setBusy(true)
      setStatus('Saving profile...')
      await api.post('/profile', { skills: selectedSkills, targetRole, roadmap, preferences, interviewInsights })
      setStatus('Profile saved.')
      toast.success('Profile saved successfully')
    } catch (error: unknown) {
      setStatus('Failed to save profile')
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to save profile'
        : 'Failed to save profile'
      toast.error(errorMessage)
    } finally {
      setBusy(false)
    }
  }

  const analyze = async () => {
    try {
      setBusy(true)
      setStatus('Analyzing skill gap...')
      toast.success('Analyzing skills...')
      const gap = await api.post('/ai/skill-gap', { skills: selectedSkills, targetRole })
      setMissing(gap.data.missing || [])
      setStatus('Generating roadmap...')
      // Normalize preferences to AI service schema
      const preferencesPayload = {
        pace: preferences.pace,
        style: preferences.style,
        hours_per_week: preferences.hoursPerWeek
      }
      const roadmapRes = await api.post('/ai/roadmap', { 
        skills: selectedSkills, 
        targetRole, 
        missing: gap.data.missing || [],
        preferences: preferencesPayload
      })
      setRoadmap(roadmapRes.data.roadmap || [])
      setStatus('Analysis complete!')
      toast.success('Skill gap analysis completed!')
    } catch (error: unknown) {
      const msg = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error || 
          (error instanceof Error ? error.message : 'Analysis failed')
        : 'Analysis failed'
      setStatus(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const getPaceColor = (pace: string) => {
    switch (pace) {
      case 'light': return 'bg-green-100 text-green-800 ring-green-600/20'
      case 'intense': return 'bg-red-100 text-red-800 ring-red-600/20'
      default: return 'bg-blue-100 text-blue-800 ring-blue-600/20'
    }
  }

  const getStyleColor = (style: string) => {
    switch (style) {
      case 'project': return 'bg-purple-100 text-purple-800 ring-purple-600/20'
      case 'theory': return 'bg-orange-100 text-orange-800 ring-orange-600/20'
      default: return 'bg-cyan-100 text-cyan-800 ring-cyan-600/20'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 relative">
      <BackgroundAnimation variant="dashboard" intensity="medium" />
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center animate-fade-in">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-white/10 backdrop-blur-sm rounded-2xl">
                <Target className="h-12 w-12" />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Skill Development Dashboard
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Build your personalized learning roadmap and track your progress toward your target role
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-900"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-10 relative z-10">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-slide-up">
          <Card className="modern-card text-center p-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-blue-100 rounded-xl dark:bg-blue-900/30">
                <Brain className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{selectedSkills.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Current Skills</div>
          </Card>

          <Card className="modern-card text-center p-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-orange-100 rounded-xl dark:bg-orange-900/30">
                <Target className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{missing.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Skills to Learn</div>
          </Card>

          <Card className="modern-card text-center p-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-green-100 rounded-xl dark:bg-green-900/30">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{roadmap.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Weeks Planned</div>
          </Card>

          <Card className="modern-card text-center p-6">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-purple-100 rounded-xl dark:bg-purple-900/30">
                <Trophy className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{preferences.hoursPerWeek}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Hours/Week</div>
          </Card>
        </div>

        {/* Profile Setup */}
        <Card className="modern-card modern-card-hover mb-8 animate-slide-up">
          <div className="p-8">
            <SectionHeader 
              title="Profile Setup" 
              icon={<Target className="h-6 w-6" />}
              className="mb-6"
            />
            
            <div className="space-y-6">
              {/* Target Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Target Role
                </label>
                <select
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="input-modern w-full"
                  disabled={busy}
                >
                  <option value="">Select a role...</option>
                  {jobs.map((job) => (
                    <option key={job} value={job}>
                      {job}
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Skills */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Current Skills
                </label>
                <div className="relative" ref={skillsDropdownRef}>
                  <div className="flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search and add skills..."
                      value={skillQuery}
                      onChange={(e) => setSkillQuery(e.target.value)}
                      onFocus={() => setSkillsOpen(true)}
                      className="input-modern pl-10 pr-10"
                      disabled={busy}
                    />
                    <button
                      onClick={() => setSkillsOpen(!skillsOpen)}
                      className="absolute right-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors"
                      disabled={busy}
                    >
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${skillsOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  
                  {skillsOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {skillQuery ? (
                        // Show filtered results when searching
                        filteredSkills.length > 0 ? (
                          filteredSkills.slice(0, 10).map((skill) => (
                            <button
                              key={skill}
                              onClick={() => {
                                addSkill(skill)
                                setSkillsOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                              {skill}
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-2 text-slate-500 dark:text-slate-400">
                            No skills found matching "{skillQuery}"
                          </div>
                        )
                      ) : (
                        // Show all available skills when not searching
                        skills.filter(skill => !selectedSkills.includes(skill)).slice(0, 15).map((skill) => (
                          <button
                            key={skill}
                            onClick={() => {
                              addSkill(skill)
                              setSkillsOpen(false)
                            }}
                            className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            {skill}
                          </button>
                        ))
                      )}
                      {!skillQuery && skills.filter(skill => !selectedSkills.includes(skill)).length > 15 && (
                        <div className="px-4 py-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700">
                          Showing 15 of {skills.filter(skill => !selectedSkills.includes(skill)).length} skills. Type to search for more.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedSkills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedSkills.map((skill) => (
                      <div key={skill} className="pill-modern bg-blue-100 text-blue-800 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-300">
                        {skill}
                        <button
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-blue-600 dark:hover:text-blue-200"
                          disabled={busy}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Learning Preferences */}
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Learning Pace
                  </label>
                  <select
                    value={preferences.pace}
                    onChange={(e) => setPreferences(prev => ({ ...prev, pace: e.target.value as Preferences['pace'] }))}
                    className="input-modern w-full"
                    disabled={busy}
                  >
                    <option value="light">Light (3-4 hrs/week)</option>
                    <option value="balanced">Balanced (5-8 hrs/week)</option>
                    <option value="intense">Intense (10+ hrs/week)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Learning Style
                  </label>
                  <select
                    value={preferences.style}
                    onChange={(e) => setPreferences(prev => ({ ...prev, style: e.target.value as Preferences['style'] }))}
                    className="input-modern w-full"
                    disabled={busy}
                  >
                    <option value="project">Project-based</option>
                    <option value="theory">Theory-focused</option>
                    <option value="mixed">Mixed approach</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Hours per Week
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={preferences.hoursPerWeek}
                    onChange={(e) => setPreferences(prev => ({ ...prev, hoursPerWeek: parseInt(e.target.value) || 6 }))}
                    className="input-modern w-full"
                    disabled={busy}
                  />
                </div>
              </div>

              {/* Current Preferences Display */}
              <div className="flex flex-wrap gap-2">
                <Pill 
                  text={`Pace: ${preferences.pace}`} 
                  className={`pill-modern ${getPaceColor(preferences.pace)}`}
                />
                <Pill 
                  text={`Style: ${preferences.style}`} 
                  className={`pill-modern ${getStyleColor(preferences.style)}`}
                />
                <Pill 
                  text={`${preferences.hoursPerWeek} hrs/week`} 
                  className="pill-modern bg-slate-100 text-slate-800 ring-slate-600/20 dark:bg-slate-800 dark:text-slate-300"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4">
                <Button
                  onClick={saveProfile}
                  disabled={busy}
                  className="btn-modern btn-secondary"
                >
                  <CheckCircle className="h-4 w-4" />
                  Save Profile
                </Button>

                <Button
                  onClick={analyze}
                  disabled={!selectedSkills.length || !targetRole || busy}
                  className="btn-modern btn-primary"
                >
                  {busy ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Generate Roadmap
                    </>
                  )}
                </Button>
              </div>

              {status && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-700 dark:text-slate-300">{status}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Missing Skills */}
        {missing.length > 0 && (
          <Card className="modern-card modern-card-hover mb-8 animate-slide-up">
            <div className="p-8">
              <SectionHeader 
                title="Skills to Learn" 
                icon={<BookOpen className="h-6 w-6 text-orange-600" />}
                className="mb-6"
              />
              <div className="flex flex-wrap gap-2">
                {missing.map((skill) => (
                  <Pill 
                    key={skill} 
                    text={skill} 
                    className="pill-modern bg-orange-100 text-orange-800 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-300"
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Learning Roadmap */}
        {roadmap.length > 0 && (
          <Card className="modern-card modern-card-hover animate-slide-up">
            <div className="p-8">
              <SectionHeader 
                title="Learning Roadmap" 
                icon={<TrendingUp className="h-6 w-6 text-green-600" />}
                className="mb-6"
              />
              <div className="space-y-6">
                {roadmap.map((week, index) => (
                  <div key={week.week} className="relative">
                    {index < roadmap.length - 1 && (
                      <div className="absolute left-6 top-12 w-0.5 h-full bg-slate-200 dark:bg-slate-700"></div>
                    )}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold">
                        {week.week}
                      </div>
                      <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                          <Clock className="h-5 w-5 text-blue-600" />
                          Week {week.week}: {week.milestone}
                        </h4>
                        <ul className="space-y-2 mb-4">
                          {week.tasks.map((task, taskIndex) => (
                            <li key={taskIndex} className="flex items-start gap-2">
                              <ArrowRight className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                              <span className="text-slate-600 dark:text-slate-400">{task}</span>
                            </li>
                          ))}
                        </ul>
                        
                        {/* Learning Resources */}
                        {week.learning_resources && week.learning_resources.length > 0 && (
                          <div className="border-t border-slate-200 dark:border-slate-600 pt-4">
                            <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-green-600" />
                              Learning Resources
                            </h5>
                            <div className="grid gap-2">
                              {week.learning_resources.map((resource, resourceIndex) => (
                                <a
                                  key={resourceIndex}
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-colors group"
                                >
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    resource.type === 'documentation' ? 'bg-blue-500' :
                                    resource.type === 'tutorial' ? 'bg-green-500' :
                                    resource.type === 'video' ? 'bg-red-500' :
                                    resource.type === 'course' ? 'bg-purple-500' :
                                    resource.type === 'project-ideas' ? 'bg-orange-500' :
                                    resource.type === 'guide' ? 'bg-indigo-500' :
                                    resource.type === 'tool' ? 'bg-pink-500' :
                                    'bg-slate-400'
                                  }`}></div>
                                  <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-1">
                                    {resource.title}
                                  </span>
                                  <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-blue-500" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}