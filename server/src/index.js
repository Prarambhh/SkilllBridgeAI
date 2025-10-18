import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import axios from 'axios'
import mongoose from 'mongoose'
import multer from 'multer'
import { createRequire } from 'module'

// Support requiring CommonJS modules from ESM files
const require = createRequire(import.meta.url)

dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())

// Multer for file uploads (PDF resumes)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me'
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000'
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skillbridge'

// MongoDB connection & model
mongoose
  .connect(MONGODB_URI, { dbName: undefined })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err?.message))

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    skills: { type: [String], default: [] },
    targetRole: { type: String, default: null },
    roadmap: { type: Array, default: [] },
    preferences: { type: Object, default: {} },
    interviewInsights: { type: Object, default: {} },
    resumeText: { type: String, default: null },
  },
  { timestamps: true }
)
const User = mongoose.model('User', userSchema)

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const existing = await User.findOne({ email })
  if (existing) return res.status(400).json({ error: 'User already exists' })
  const hash = await bcrypt.hash(password, 10)
  await User.create({ email, password: hash })
  const token = generateToken({ email })
  res.json({ token })
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const user = await User.findOne({ email })
  if (!user) return res.status(400).json({ error: 'Invalid credentials' })
  const match = await bcrypt.compare(password, user.password)
  if (!match) return res.status(400).json({ error: 'Invalid credentials' })
  const token = generateToken({ email })
  res.json({ token })
})

function auth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'No token' })
  const token = authHeader.split(' ')[1]
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// Skills and jobs (static scaffold)
const ALL_SKILLS = ['JavaScript','React','Node.js','Express','MongoDB','Python','FastAPI','Docker','AWS','NLP','TailwindCSS']
const JOB_ROLES = ['Frontend Developer','Backend Developer','Full-Stack Developer','ML Engineer','Data Scientist']

app.get('/api/meta/skills', (req, res) => res.json({ skills: ALL_SKILLS }))
app.get('/api/meta/jobs', (req, res) => res.json({ jobs: JOB_ROLES }))

app.post('/api/profile', auth, async (req, res) => {
  const {
    skills = [],
    targetRole = null,
    roadmap = [],
    preferences = {},
    interviewInsights = {},
    resumeText = null,
  } = req.body || {}
  const updated = await User.findOneAndUpdate(
    { email: req.user.email },
    { $set: { skills, targetRole, roadmap, preferences, interviewInsights, resumeText } },
    { new: true }
  )
  if (!updated) return res.status(400).json({ error: 'User not found' })
  res.json({ ok: true })
})

app.get('/api/profile', auth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email })
  if (!user) return res.status(400).json({ error: 'User not found' })
  res.json({
    email: user.email,
    skills: user.skills || [],
    targetRole: user.targetRole || null,
    roadmap: user.roadmap || [],
    preferences: user.preferences || {},
    interviewInsights: user.interviewInsights || {},
    resumeText: user.resumeText || null,
  })
})

// AI service stubs integration
app.post('/api/ai/skill-gap', auth, async (req, res) => {
  const { skills = [], targetRole } = req.body || {}
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/gap`, { skills, target_role: targetRole })
    res.json({ targetRole: data.targetRole, missing: data.missing })
  } catch (e) {
    console.warn('AI gap unavailable, using fallback:', e?.message)
    const role = (targetRole || '').toLowerCase()
    let desired = []
    if (role.includes('frontend')) {
      desired = ['React','TailwindCSS']
    } else if (role.includes('backend')) {
      desired = ['Node.js','Express','MongoDB','Docker']
    } else if ((role.includes('full') && role.includes('stack')) || role.includes('full-stack')) {
      desired = ['React','TailwindCSS','Node.js','Express','MongoDB','Docker','AWS']
    } else if (role.includes('ml')) {
      desired = ['Python','NLP','Docker','AWS']
    } else if (role.includes('data') && role.includes('scientist')) {
      desired = ['Python','NLP','AWS','MongoDB']
    } else {
      desired = ['React','Node.js','MongoDB','Docker','AWS']
    }
    const missing = desired.filter(s => !skills.includes(s))
    res.json({ targetRole, missing })
  }
})

app.post('/api/ai/roadmap', auth, async (req, res) => {
  const { missing = [], preferences = {}, interview = {} } = req.body || {}
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/roadmap`, { missing, preferences, interview })
    res.json({ roadmap: data.roadmap })
  } catch (e) {
    console.warn('AI roadmap unavailable, using fallback:', e?.message)
    const roadmap = missing.map((m, i) => ({ week: i + 1, milestone: `Learn ${m}`, tasks: [`Read docs for ${m}`, `Build a mini project with ${m}`] }))
    res.json({ roadmap })
  }
})

// Resume analysis: upload PDF and analyze content
app.post('/api/ai/resume/analyze', auth, upload.single('file'), async (req, res) => {
  const targetRole = (req.body?.targetRole || null)
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  // Always try to parse the PDF first so we can use text even in fallback
  let text = ''
  try {
    const pdfParse = require('pdf-parse')
    const parsed = await pdfParse(req.file.buffer)
    text = (parsed.text || '').slice(0, 20000)
  } catch (parseErr) {
    console.warn('PDF parse failed; continuing with filename-only fallback:', parseErr?.message)
  }

  // Try AI service with parsed text
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/resume/analyze`, { text, target_role: targetRole })
    
    // Store resume text in user profile for interview questions
    if (text) {
      await User.findOneAndUpdate(
        { email: req.user.email },
        { $set: { resumeText: text } },
        { new: true }
      )
    }
    
    return res.json(data)
  } catch (e) {
    console.warn('AI resume analyze unavailable, using fallback:', e?.message)
    const role = (targetRole || '').toLowerCase()
    let desired = []
    if (role.includes('frontend')) {
      desired = ['React','TailwindCSS']
    } else if (role.includes('backend')) {
      desired = ['Node.js','Express','MongoDB','Docker']
    } else if ((role.includes('full') && role.includes('stack')) || role.includes('full-stack')) {
      desired = ['React','TailwindCSS','Node.js','Express','MongoDB','Docker','AWS']
    } else if (role.includes('ml')) {
      desired = ['Python','NLP','Docker','AWS']
    } else if (role.includes('data') && role.includes('scientist')) {
      desired = ['Python','NLP','AWS','MongoDB']
    } else {
      desired = ['React','Node.js','MongoDB','Docker','AWS']
    }
    const sourceText = (text || '').toLowerCase() || (req.file?.originalname || '').toLowerCase()
    const found = ALL_SKILLS.filter(s => sourceText.includes(s.toLowerCase()))
    const missing = desired.filter(s => !found.includes(s))
    const fit = Math.round(100 * (desired.length - missing.length) / Math.max(1, desired.length))
    // Simple resume score out of 10 based on fit only in fallback
    // Enhanced analysis metrics
    const words = text.split(/\s+/).length
    const hasMetrics = /\b(\d+%|\d+\s*percent|increased|decreased|improved|reduced|growth|roi)\b/i.test(text) || /\d/.test(text)
    const hasProjects = /\b(project|built|developed|implemented|deployed|launched|created)\b/i.test(text)
    const structureHits = ['experience', 'education', 'skills', 'projects', 'summary'].filter(s => text.toLowerCase().includes(s)).length
    const wellStructured = structureHits >= 2
    const goodLength = words >= 200 && words <= 1500
    
    // Enhanced scoring
    const scoreBase = (fit / 100.0) * 6.0
    let bonus = 0.0
    if (hasMetrics) bonus += 1.0
    if (wellStructured) bonus += 1.0
    if (hasProjects) bonus += 1.0
    if (goodLength) bonus += 1.0
    const resume_score = Math.max(0, Math.min(10, Math.round(scoreBase + bonus)))
    
    // Comprehensive detailed analysis
    const executiveSummary = `
EXECUTIVE SUMMARY:
This resume analysis evaluates your candidacy for the ${targetRole || 'target'} role. Your current profile demonstrates ${found.length} relevant technical skills with a ${fit}% role alignment score. The overall resume quality scores ${resume_score}/10 based on technical competency, quantified achievements, project demonstrations, and structural clarity.

TECHNICAL COMPETENCY ASSESSMENT:
Your resume showcases proficiency in ${found.length} key technologies: ${found.slice(0,8).join(', ') || 'Limited technical skills detected'}. For the ${targetRole || 'target'} position, you're missing ${missing.length} critical skills that could significantly impact your candidacy.

CONTENT QUALITY EVALUATION:
${hasMetrics ? 'Strong quantified achievements detected - excellent use of metrics and impact statements.' : 'Missing quantified achievements - consider adding specific numbers, percentages, and measurable outcomes.'}
${hasProjects ? 'Demonstrates hands-on project experience effectively.' : 'Limited project showcase - highlight recent development work and technical implementations.'}
${wellStructured ? 'Well-structured with clear sections and professional formatting.' : 'Structure needs improvement - ensure clear Experience, Education, and Skills sections.'}
${goodLength ? 'Appropriate length for comprehensive review.' : 'Length optimization needed - aim for 1-2 pages with focused, relevant content.'}

ATS COMPATIBILITY & KEYWORD ANALYSIS:
Your resume contains ${found.length} of ${desired.length} target keywords for this role. Missing keywords that could improve ATS ranking: ${missing.slice(0,5).join(', ') || 'None - excellent keyword coverage'}.

SCORING BREAKDOWN:
• Technical Skills Match: ${Math.round((found.length/Math.max(1,desired.length))*100)}% (${found.length}/${desired.length} skills)
• Achievement Quantification: ${hasMetrics ? '✓ Strong' : '✗ Needs Improvement'}
• Project Demonstration: ${hasProjects ? '✓ Present' : '✗ Missing'}
• Structure & Formatting: ${wellStructured ? '✓ Professional' : '✗ Needs Work'}
• Content Length: ${goodLength ? '✓ Optimal' : '✗ Suboptimal'}

OVERALL RECOMMENDATION:
${resume_score >= 7 ? 'Strong candidate profile with minor optimizations needed.' : resume_score >= 5 ? 'Good foundation requiring strategic improvements.' : 'Significant enhancements recommended before applying.'}
    `.trim()
    
    // Detailed strengths
    const strengths = []
    if (found.length > 0) {
      strengths.push(`TECHNICAL PROFICIENCY: Demonstrates solid command of ${found.length} key technologies including ${found.slice(0,4).join(', ')}${found.length > 4 ? '...' : ''}. This technical foundation aligns well with industry standards.`)
    }
    if (hasMetrics) {
      strengths.push("QUANTIFIED ACHIEVEMENTS: Excellent use of specific metrics, percentages, and measurable outcomes that clearly demonstrate impact and value delivered to previous organizations.")
    }
    if (hasProjects) {
      strengths.push("PROJECT PORTFOLIO: Strong showcase of hands-on development experience with practical implementations, indicating ability to translate technical skills into real-world solutions.")
    }
    if (wellStructured) {
      strengths.push("PROFESSIONAL PRESENTATION: Well-organized resume structure with clear sections, making it easy for recruiters and ATS systems to parse and evaluate your qualifications.")
    }
    if (goodLength) {
      strengths.push("OPTIMAL CONTENT LENGTH: Appropriate resume length that provides comprehensive information without overwhelming the reader, demonstrating good communication skills.")
    }
    
    // Detailed weaknesses
    const weaknesses = []
    if (missing.length > 0) {
      const criticalMissing = missing.slice(0,3)
      weaknesses.push(`SKILL GAPS: Missing ${missing.length} critical skills for this role, particularly ${criticalMissing.join(', ')}. Consider online courses, bootcamps, or personal projects to develop these competencies.`)
    }
    if (!hasMetrics) {
      weaknesses.push("IMPACT QUANTIFICATION: Lacks specific numbers and measurable achievements. Add metrics like 'Improved performance by 25%', 'Reduced load time by 40%', or 'Managed team of 5 developers' to demonstrate concrete value.")
    }
    if (!hasProjects) {
      weaknesses.push("PROJECT SHOWCASE: Limited evidence of practical application. Include 2-3 recent projects with technology stack, challenges solved, and outcomes achieved to demonstrate hands-on experience.")
    }
    if (!wellStructured) {
      weaknesses.push("STRUCTURAL CLARITY: Resume organization needs improvement. Ensure clear sections for Professional Experience, Technical Skills, Education, and Projects with consistent formatting throughout.")
    }
    if (!goodLength) {
      if (words < 200) {
        weaknesses.push("CONTENT DEPTH: Resume appears too brief. Expand with more detailed descriptions of responsibilities, achievements, and technical implementations to reach 1-2 pages.")
      } else {
        weaknesses.push("CONTENT CONCISENESS: Resume may be too lengthy. Focus on most relevant experiences and achievements, removing outdated or less relevant information to improve readability.")
      }
    }
    
    // Comprehensive notes
    const notes = []
    if (missing.length > 0) {
      const prioritySkills = missing.slice(0,3)
      const secondarySkills = missing.slice(3,6)
      notes.push(`PRIORITY SKILL DEVELOPMENT: Focus immediately on ${prioritySkills.join(', ')} as these are critical for the ${targetRole || 'target'} role. Recommended learning path: online courses → personal projects → portfolio showcase.`)
      if (secondarySkills.length > 0) {
        notes.push(`SECONDARY SKILLS: Consider developing ${secondarySkills.join(', ')} to further strengthen your candidacy and stand out from other applicants.`)
      }
    }
    
    if (found.length > 0) {
      notes.push(`LEVERAGE EXISTING STRENGTHS: Your proficiency in ${found.slice(0,6).join(', ')} is valuable. Consider highlighting specific projects or achievements using these technologies to demonstrate depth of experience.`)
    }
    
    if (resume_score < 7) {
      notes.push("IMMEDIATE ACTIONS: 1) Add 2-3 quantified achievements per role, 2) Include links to GitHub/portfolio, 3) Tailor keywords to job descriptions, 4) Get feedback from industry professionals.")
    }
    
    if (fit < 70) {
      notes.push(`ROLE ALIGNMENT: Current ${fit}% role fit suggests significant skill gaps. Consider targeting roles that better match your current skillset while developing missing competencies, or invest 3-6 months in intensive skill development.`)
    }
    
    notes.push("ATS OPTIMIZATION: Ensure your resume includes exact keyword matches from job postings, uses standard section headers, and is saved in both PDF and Word formats for different application systems.")
    
    // Store resume text in user profile for interview questions
    if (text) {
      await User.findOneAndUpdate(
        { email: req.user.email },
        { $set: { resumeText: text } },
        { new: true }
      )
    }
    
    return res.json({ 
      summary: executiveSummary, 
      targetRole, 
      fit, 
      resume_score, 
      extracted_skills: found, 
      missing_skills: missing, 
      strengths, 
      weaknesses, 
      notes 
    })
  }
})

app.post('/api/ai/interview/start', auth, async (req, res) => {
  const { targetRole, skills = [] } = req.body || {}
  try {
    // Fetch user's resume text from profile
    const user = await User.findById(req.userId)
    const resumeText = user?.resumeText || null
    
    const { data } = await axios.post(`${AI_SERVICE_URL}/interview/start`, { 
      target_role: targetRole, 
      skills,
      resume_text: resumeText 
    })
    res.json({ questions: data.questions || [] })
  } catch (e) {
    console.warn('AI interview start unavailable, using fallback:', e?.message)
    const questions = [
      'Tell me about a project you built and what you learned.',
      'How do you approach debugging complex issues?',
      'Describe how you collaborate in a team setting.',
    ]
    res.json({ questions })
  }
})

// Enhanced interview start with resume analysis data
app.post('/api/ai/interview/start-detailed', auth, async (req, res) => {
  const { targetRole, skills = [], resumeAnalysis = null } = req.body || {}
  try {
    // Fetch user's resume text from profile
    const user = await User.findById(req.userId)
    const resumeText = user?.resumeText || null
    
    // Use detailed endpoint if we have resume analysis data
    const endpoint = resumeAnalysis ? '/interview/start-detailed' : '/interview/start'
    const payload = {
      target_role: targetRole,
      skills,
      resume_text: resumeText
    }
    
    // Add resume analysis if available
    if (resumeAnalysis) {
      payload.resume_analysis = resumeAnalysis
    }
    
    const { data } = await axios.post(`${AI_SERVICE_URL}${endpoint}`, payload)
    res.json({ questions: data.questions || [] })
  } catch (e) {
    console.warn('AI detailed interview start unavailable, using fallback:', e?.message)
    const questions = [
      'Tell me about a project you built and what you learned.',
      'How do you approach debugging complex issues?',
      'Describe how you collaborate in a team setting.',
    ]
    res.json({ questions })
  }
})

app.post('/api/ai/interview/score', auth, async (req, res) => {
  const { question = '', answer = '' } = req.body || {}
  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/interview/score`, { question, answer })
    res.json({ score: data.score, feedback: data.feedback })
  } catch (e) {
    console.warn('AI interview score unavailable, using fallback:', e?.message)
    const len = (answer || '').trim().length
    const score = Math.min(100, Math.max(10, Math.floor(len / 5)))
    const feedback = score > 60 ? 'Solid answer.' : score > 30 ? 'Add more detail and examples.' : 'Try to address the core concepts directly.'
    res.json({ score, feedback })
  }
})



app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})