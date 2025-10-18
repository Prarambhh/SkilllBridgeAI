import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type React from 'react'
import { Card, SectionHeader, Button } from '../components/ui'
import BackgroundAnimation from '../components/BackgroundAnimation'
import { 
  Target, 
  CheckCircle,
  X,
  ChevronDown,
  Plus,
  Flame,
  Award
} from 'lucide-react'

interface Habit {
  id: string
  title: string
  category: string
  frequency: string
  websiteLink?: string
  streak: number
  completedDates: string[]
  createdAt: string
}

interface HabitStats {
  todayCompleted: number
  todayTotal: number
  longestStreak: number
  totalScore: number
}

interface DropdownProps {
  isOpen: boolean
  onClose: () => void
  buttonRef: React.RefObject<HTMLButtonElement | null>
  options: string[]
  onSelect: (option: string) => void
  dataAttribute?: string
}

function Dropdown({ isOpen, onClose, buttonRef, options, onSelect, dataAttribute }: DropdownProps) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 })

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      })
    }
  }, [isOpen, buttonRef])

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      data-dropdown={dataAttribute}
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 9999
      }}
    >
      {options.map((option) => (
        <button
          key={option}
          onClick={() => {
            onSelect(option)
            onClose()
          }}
          className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white first:rounded-t-lg last:rounded-b-lg"
        >
          {option}
        </button>
      ))}
    </div>,
    document.body
  )
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [stats, setStats] = useState<HabitStats>({
    todayCompleted: 0,
    todayTotal: 0,
    longestStreak: 0,
    totalScore: 0
  })
  
  // Form states
  const [habitTitle, setHabitTitle] = useState('')
  const [habitCategory, setHabitCategory] = useState('Fitness')
  const [habitFrequency, setHabitFrequency] = useState('7 times a week')
  const [websiteLink, setWebsiteLink] = useState('')
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [frequencyOpen, setFrequencyOpen] = useState(false)
  const categoryButtonRef = useRef<HTMLButtonElement>(null)
  const frequencyButtonRef = useRef<HTMLButtonElement>(null)

  const categories = ['Fitness', 'Learning', 'Health', 'Productivity', 'Mindfulness', 'Social', 'Creative']
  const frequencies = ['Daily', '7 times a week', '5 times a week', '3 times a week', 'Weekly']

  // Load habits from localStorage on component mount
  useEffect(() => {
    const savedHabits = localStorage.getItem('skillbridge_habits')
    if (savedHabits) {
      const parsedHabits = JSON.parse(savedHabits)
      setHabits(parsedHabits)
      calculateStats(parsedHabits)
    }
  }, [])

  // Save habits to localStorage whenever habits change
  useEffect(() => {
    localStorage.setItem('skillbridge_habits', JSON.stringify(habits))
    calculateStats(habits)
  }, [habits])

  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      // Check if click is outside category button and dropdown
      if (categoryOpen && categoryButtonRef.current && !categoryButtonRef.current.contains(target) && !target.closest('[data-dropdown="category"]')) {
        setCategoryOpen(false)
      }
      
      // Check if click is outside frequency button and dropdown
      if (frequencyOpen && frequencyButtonRef.current && !frequencyButtonRef.current.contains(target) && !target.closest('[data-dropdown="frequency"]')) {
        setFrequencyOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [categoryOpen, frequencyOpen])

  const calculateStats = (habitList: Habit[]) => {
    const today = new Date().toISOString().split('T')[0]
    const todayCompleted = habitList.filter(habit => 
      habit.completedDates.includes(today)
    ).length
    
    const longestStreak = habitList.reduce((max, habit) => 
      Math.max(max, habit.streak), 0
    )
    
    const totalScore = habitList.reduce((total, habit) => 
      total + habit.completedDates.length, 0
    )

    setStats({
      todayCompleted,
      todayTotal: habitList.length,
      longestStreak,
      totalScore
    })
  }

  const addHabit = () => {
    if (!habitTitle.trim()) return

    const newHabit: Habit = {
      id: Date.now().toString(),
      title: habitTitle,
      category: habitCategory,
      frequency: habitFrequency,
      websiteLink: websiteLink || undefined,
      streak: 0,
      completedDates: [],
      createdAt: new Date().toISOString()
    }

    setHabits(prev => [...prev, newHabit])
    
    // Reset form
    setHabitTitle('')
    setWebsiteLink('')
    
    // Show success toast
    window.dispatchEvent(new CustomEvent('sb:toast', { 
      detail: { type: 'success', message: 'Habit added successfully!' } 
    }))
  }

  const toggleHabitCompletion = (habitId: string) => {
    const today = new Date().toISOString().split('T')[0]
    
    setHabits(prev => prev.map(habit => {
      if (habit.id === habitId) {
        const isCompleted = habit.completedDates.includes(today)
        let newCompletedDates: string[]
        let newStreak = habit.streak

        if (isCompleted) {
          // Remove today's completion
          newCompletedDates = habit.completedDates.filter(date => date !== today)
          newStreak = calculateStreak(newCompletedDates)
        } else {
          // Add today's completion
          newCompletedDates = [...habit.completedDates, today].sort()
          newStreak = calculateStreak(newCompletedDates)
        }

        return {
          ...habit,
          completedDates: newCompletedDates,
          streak: newStreak
        }
      }
      return habit
    }))
  }

  const calculateStreak = (completedDates: string[]): number => {
    if (completedDates.length === 0) return 0
    
    const sortedDates = completedDates.sort().reverse()
    const today = new Date().toISOString().split('T')[0]
    
    let streak = 0
    let currentDate = new Date(today)
    
    for (const dateStr of sortedDates) {
      const date = new Date(dateStr)
      const diffTime = currentDate.getTime() - date.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === streak) {
        streak++
        currentDate = new Date(date)
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        break
      }
    }
    
    return streak
  }

  const deleteHabit = (habitId: string) => {
    setHabits(prev => prev.filter(habit => habit.id !== habitId))
    window.dispatchEvent(new CustomEvent('sb:toast', { 
      detail: { type: 'success', message: 'Habit deleted successfully!' } 
    }))
  }

  const getCompletionHistory = (habit: Habit) => {
    const today = new Date()
    const last7Days = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayLetter = date.toLocaleDateString('en', { weekday: 'short' })[0]
      
      last7Days.push({
        date: dateStr,
        day: dayLetter,
        completed: habit.completedDates.includes(dateStr)
      })
    }
    
    return last7Days
  }

  return (
    <div className="relative min-h-screen">
      <BackgroundAnimation variant="default" intensity="medium" />
      <div className="relative z-10 space-y-6">
      <SectionHeader 
        title="Habit Tracker" 
        subtitle="Build consistent habits and track your progress"
        icon={<Target className="h-6 w-6" />}
      />

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Today's Progress</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.todayCompleted}/{stats.todayTotal}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Habits Completed</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Longest Streak</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.longestStreak}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Days in a Row</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Score</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalScore}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Points Earned</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Award className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Add Habit Form */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Habit Title"
              value={habitTitle}
              onChange={(e) => setHabitTitle(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <div className="relative">
              <button
                ref={categoryButtonRef}
                onClick={() => setCategoryOpen(!categoryOpen)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
              >
                {habitCategory}
                <ChevronDown className={`h-4 w-4 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
              </button>
              <Dropdown
                isOpen={categoryOpen}
                onClose={() => setCategoryOpen(false)}
                buttonRef={categoryButtonRef}
                options={categories}
                onSelect={setHabitCategory}
                dataAttribute="category"
              />
            </div>

            <div className="relative">
              <button
                ref={frequencyButtonRef}
                onClick={() => setFrequencyOpen(!frequencyOpen)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between"
              >
                {habitFrequency}
                <ChevronDown className={`h-4 w-4 transition-transform ${frequencyOpen ? 'rotate-180' : ''}`} />
              </button>
              <Dropdown
                isOpen={frequencyOpen}
                onClose={() => setFrequencyOpen(false)}
                buttonRef={frequencyButtonRef}
                options={frequencies}
                onSelect={setHabitFrequency}
                dataAttribute="frequency"
              />
            </div>

            <Button onClick={addHabit} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add Habit
            </Button>
          </div>

          <input
            type="url"
            placeholder="Optional: Website Link (e.g., https://youtube.com/meditation)"
            value={websiteLink}
            onChange={(e) => setWebsiteLink(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </Card>

      {/* Habits List */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Habits</h3>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Completion History (7 Days)
            </div>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">No habits yet. Add your first habit above!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {habits.map(habit => {
                const today = new Date().toISOString().split('T')[0]
                const isCompletedToday = habit.completedDates.includes(today)
                const completionHistory = getCompletionHistory(habit)

                return (
                  <div key={habit.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900 dark:text-white">{habit.title}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">- {habit.category}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">({habit.frequency})</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                            {habit.streak} Days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Completion History */}
                      <div className="flex space-x-1">
                        {completionHistory.map((day, index) => (
                          <div key={index} className="text-center">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{day.day}</div>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              day.completed 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                            }`}>
                              {day.completed ? '✓' : ''}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleHabitCompletion(habit.id)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isCompletedToday
                              ? 'bg-green-600 text-white hover:bg-green-700'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                        >
                          {isCompletedToday ? 'Completed!' : 'Mark Complete'}
                        </button>
                        <button
                          onClick={() => deleteHabit(habit.id)}
                          className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>
      </div>
    </div>
  )
}