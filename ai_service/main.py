from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SkillBridge AI Service")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GapRequest(BaseModel):
    skills: list[str]
    target_role: str

class RoadmapRequest(BaseModel):
    missing: list[str]
    # Optional user preferences to personalize roadmap
    preferences: dict | None = None
    # Optional interview insights to emphasize weak areas and strengths
    interview: dict | None = None

class InterviewStartRequest(BaseModel):
    target_role: str | None = None
    skills: list[str] = []
    resume_text: str | None = None

class DetailedInterviewRequest(BaseModel):
    target_role: str | None = None
    skills: list[str] = []
    resume_text: str | None = None
    resume_analysis: dict | None = None  # Detailed analysis from resume analysis endpoint

class InterviewScoreRequest(BaseModel):
    question: str
    answer: str

class ResumeAnalyzeRequest(BaseModel):
    text: str
    target_role: str | None = None

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/gap")
async def gap(req: GapRequest):
    # Role-aware missing skills mapping (stubbed). In production, replace with
    # embeddings/similarity against a role competency model.
    role = (req.target_role or "").lower()
    if "frontend" in role:
        desired = ["React", "TailwindCSS"]
    elif "backend" in role:
        desired = ["Node.js", "Express", "MongoDB", "Docker"]
    elif ("full" in role and "stack" in role) or "full-stack" in role:
        desired = ["React", "TailwindCSS", "Node.js", "Express", "MongoDB", "Docker", "AWS"]
    elif "ml" in role:
        desired = ["Python", "NLP", "Docker", "AWS"]
    elif "data" in role and "scientist" in role:
        desired = ["Python", "NLP", "AWS", "MongoDB"]
    else:
        # Generic baseline set if role is unknown
        desired = ["React", "Node.js", "MongoDB", "Docker", "AWS"]

    # Compute missing against selected skills
    missing = [s for s in desired if s not in req.skills]
    return {"targetRole": req.target_role, "missing": missing}

@app.post("/roadmap")
async def roadmap(req: RoadmapRequest):
    # Generate a richer multi-week roadmap from missing skills, personalized by preferences/interview
    missing = [m.strip() for m in (req.missing or []) if m and isinstance(m, str)]
    if not missing:
        return {"roadmap": []}

    prefs = req.preferences or {}
    interview = req.interview or {}

    # Derive ordering and emphasis from preferences
    focus = [f.lower() for f in (prefs.get("focus") or []) if isinstance(f, str)]
    pace = (prefs.get("pace") or "balanced").lower()  # fast | balanced | slow
    hours = int(prefs.get("availability_hours") or 6)

    # Map areas to skills for prioritization
    area_map = {
        "frontend": ["React", "TailwindCSS"],
        "backend": ["Node.js", "Express", "MongoDB"],
        "cloud": ["AWS", "Docker"],
        "ml": ["Python", "NLP"],
    }
    prioritized: list[str] = []
    for area in focus:
        for s in area_map.get(area, []):
            if s in missing and s not in prioritized:
                prioritized.append(s)
    # Append remaining missing skills
    for s in missing:
        if s not in prioritized:
            prioritized.append(s)

    # Use interview insights to add reinforcement weeks for weak topics
    weak_topics = [t for t in (interview.get("weak_topics") or []) if isinstance(t, str)]
    strength_topics = [t for t in (interview.get("strength_topics") or []) if isinstance(t, str)]
    avg_score = int(interview.get("avg_score") or 0)

    weeks: list[dict] = []

    def get_learning_resources(skill: str, milestone_type: str) -> list[dict]:
        """Generate learning resources based on skill and milestone type"""
        resources = []
        
        # Common resource mapping for different skills
        skill_resources = {
            "React": {
                "foundations": [
                    {"title": "React Official Documentation", "url": "https://react.dev/learn", "type": "documentation"},
                    {"title": "React Tutorial for Beginners", "url": "https://www.freecodecamp.org/news/react-beginner-handbook/", "type": "tutorial"},
                    {"title": "React Hooks Explained", "url": "https://www.youtube.com/watch?v=O6P86uwfdR0", "type": "video"}
                ],
                "project": [
                    {"title": "React Project Ideas", "url": "https://github.com/florinpop17/app-ideas", "type": "project-ideas"},
                    {"title": "Testing React Apps", "url": "https://testing-library.com/docs/react-testing-library/intro/", "type": "documentation"},
                    {"title": "React Best Practices", "url": "https://react.dev/learn/thinking-in-react", "type": "guide"}
                ]
            },
            "Node.js": {
                "foundations": [
                    {"title": "Node.js Official Docs", "url": "https://nodejs.org/en/docs/", "type": "documentation"},
                    {"title": "Node.js Tutorial", "url": "https://www.w3schools.com/nodejs/", "type": "tutorial"},
                    {"title": "Node.js Crash Course", "url": "https://www.youtube.com/watch?v=fBNz5xF-Kx4", "type": "video"}
                ],
                "project": [
                    {"title": "Express.js Guide", "url": "https://expressjs.com/en/starter/installing.html", "type": "documentation"},
                    {"title": "Node.js Testing with Jest", "url": "https://jestjs.io/docs/getting-started", "type": "documentation"},
                    {"title": "Node.js Best Practices", "url": "https://github.com/goldbergyoni/nodebestpractices", "type": "guide"}
                ]
            },
            "Python": {
                "foundations": [
                    {"title": "Python Official Tutorial", "url": "https://docs.python.org/3/tutorial/", "type": "documentation"},
                    {"title": "Python for Beginners", "url": "https://www.python.org/about/gettingstarted/", "type": "tutorial"},
                    {"title": "Python Crash Course", "url": "https://www.youtube.com/watch?v=rfscVS0vtbw", "type": "video"}
                ],
                "project": [
                    {"title": "Python Project Ideas", "url": "https://github.com/karan/Projects", "type": "project-ideas"},
                    {"title": "Python Testing with pytest", "url": "https://docs.pytest.org/en/stable/", "type": "documentation"},
                    {"title": "Python Best Practices", "url": "https://realpython.com/python-code-quality/", "type": "guide"}
                ]
            },
            "MongoDB": {
                "foundations": [
                    {"title": "MongoDB University", "url": "https://university.mongodb.com/", "type": "course"},
                    {"title": "MongoDB Tutorial", "url": "https://www.mongodb.com/docs/manual/tutorial/", "type": "tutorial"},
                    {"title": "MongoDB Crash Course", "url": "https://www.youtube.com/watch?v=pWbMrx5rVBE", "type": "video"}
                ],
                "project": [
                    {"title": "MongoDB with Node.js", "url": "https://www.mongodb.com/docs/drivers/node/current/", "type": "documentation"},
                    {"title": "MongoDB Schema Design", "url": "https://www.mongodb.com/docs/manual/data-modeling/", "type": "guide"},
                    {"title": "MongoDB Performance", "url": "https://www.mongodb.com/docs/manual/administration/analyzing-mongodb-performance/", "type": "guide"}
                ]
            },
            "Express": {
                "foundations": [
                    {"title": "Express.js Official Guide", "url": "https://expressjs.com/en/guide/routing.html", "type": "documentation"},
                    {"title": "Express.js Tutorial", "url": "https://www.tutorialspoint.com/expressjs/", "type": "tutorial"},
                    {"title": "Express.js Crash Course", "url": "https://www.youtube.com/watch?v=L72fhGm1tfE", "type": "video"}
                ],
                "project": [
                    {"title": "Express.js Best Practices", "url": "https://expressjs.com/en/advanced/best-practice-security.html", "type": "guide"},
                    {"title": "Express.js Testing", "url": "https://www.albertgao.xyz/2017/05/24/how-to-test-expressjs-with-jest-and-supertest/", "type": "tutorial"},
                    {"title": "Express.js Middleware", "url": "https://expressjs.com/en/guide/using-middleware.html", "type": "documentation"}
                ]
            },
            "AWS": {
                "foundations": [
                    {"title": "AWS Getting Started", "url": "https://aws.amazon.com/getting-started/", "type": "documentation"},
                    {"title": "AWS Free Tier", "url": "https://aws.amazon.com/free/", "type": "tutorial"},
                    {"title": "AWS Fundamentals", "url": "https://www.youtube.com/watch?v=ulprqHHWlng", "type": "video"}
                ],
                "project": [
                    {"title": "AWS Project Ideas", "url": "https://aws.amazon.com/getting-started/hands-on/", "type": "project-ideas"},
                    {"title": "AWS Well-Architected", "url": "https://aws.amazon.com/architecture/well-architected/", "type": "guide"},
                    {"title": "AWS Security Best Practices", "url": "https://aws.amazon.com/architecture/security-identity-compliance/", "type": "guide"}
                ]
            },
            "Docker": {
                "foundations": [
                    {"title": "Docker Official Tutorial", "url": "https://docs.docker.com/get-started/", "type": "documentation"},
                    {"title": "Docker for Beginners", "url": "https://docker-curriculum.com/", "type": "tutorial"},
                    {"title": "Docker Crash Course", "url": "https://www.youtube.com/watch?v=fqMOX6JJhGo", "type": "video"}
                ],
                "project": [
                    {"title": "Docker Best Practices", "url": "https://docs.docker.com/develop/dev-best-practices/", "type": "guide"},
                    {"title": "Docker Compose Tutorial", "url": "https://docs.docker.com/compose/gettingstarted/", "type": "tutorial"},
                    {"title": "Docker Security", "url": "https://docs.docker.com/engine/security/", "type": "guide"}
                ]
            },
            "TailwindCSS": {
                "foundations": [
                    {"title": "Tailwind CSS Documentation", "url": "https://tailwindcss.com/docs", "type": "documentation"},
                    {"title": "Tailwind CSS Tutorial", "url": "https://www.youtube.com/watch?v=UBOj6rqRUME", "type": "video"},
                    {"title": "Tailwind CSS Components", "url": "https://tailwindui.com/components", "type": "examples"}
                ],
                "project": [
                    {"title": "Tailwind CSS Best Practices", "url": "https://tailwindcss.com/docs/reusing-styles", "type": "guide"},
                    {"title": "Tailwind CSS with React", "url": "https://tailwindcss.com/docs/guides/create-react-app", "type": "tutorial"},
                    {"title": "Responsive Design with Tailwind", "url": "https://tailwindcss.com/docs/responsive-design", "type": "documentation"}
                ]
            },
            "NLP": {
                "foundations": [
                    {"title": "Natural Language Processing with Python", "url": "https://www.nltk.org/book/", "type": "book"},
                    {"title": "spaCy Tutorial", "url": "https://spacy.io/usage/spacy-101", "type": "tutorial"},
                    {"title": "NLP Course by Hugging Face", "url": "https://huggingface.co/course/chapter1/1", "type": "course"}
                ],
                "project": [
                    {"title": "NLP Project Ideas", "url": "https://github.com/keon/awesome-nlp", "type": "project-ideas"},
                    {"title": "Transformers Library", "url": "https://huggingface.co/docs/transformers/index", "type": "documentation"},
                    {"title": "NLP with PyTorch", "url": "https://pytorch.org/tutorials/beginner/nlp/", "type": "tutorial"}
                ]
            }
        }
        
        # Default resources for unknown skills
        default_resources = {
            "foundations": [
                {"title": f"{skill} Official Documentation", "url": f"https://www.google.com/search?q={skill}+official+documentation", "type": "documentation"},
                {"title": f"{skill} Tutorial", "url": f"https://www.google.com/search?q={skill}+tutorial+beginner", "type": "tutorial"},
                {"title": f"{skill} Video Course", "url": f"https://www.youtube.com/results?search_query={skill}+crash+course", "type": "video"}
            ],
            "project": [
                {"title": f"{skill} Project Ideas", "url": f"https://www.google.com/search?q={skill}+project+ideas", "type": "project-ideas"},
                {"title": f"{skill} Best Practices", "url": f"https://www.google.com/search?q={skill}+best+practices", "type": "guide"},
                {"title": f"{skill} Testing Guide", "url": f"https://www.google.com/search?q={skill}+testing+guide", "type": "guide"}
            ]
        }
        
        # Determine milestone type
        if "foundations" in milestone_type.lower():
            resource_type = "foundations"
        elif "project" in milestone_type.lower():
            resource_type = "project"
        elif "reinforcement" in milestone_type.lower():
            resource_type = "project"  # Use project resources for reinforcement
        else:
            resource_type = "foundations"  # Default
        
        # Get resources for the skill
        skill_key = skill
        if skill_key not in skill_resources:
            # Try to find a partial match
            for key in skill_resources.keys():
                if key.lower() in skill.lower() or skill.lower() in key.lower():
                    skill_key = key
                    break
        
        if skill_key in skill_resources:
            resources = skill_resources[skill_key].get(resource_type, [])
        else:
            resources = default_resources.get(resource_type, [])
        
        return resources

    def add_week(milestone: str, tasks: list[str], skill: str = ""):
        # Adjust number/complexity of tasks lightly based on pace and hours
        base_tasks = tasks.copy()
        if pace == "fast" and hours >= 8:
            base_tasks.append("Optional advanced reading/practice for stretch goals")
        elif pace == "slow" or hours < 5:
            # focus on fewer, deeper tasks
            base_tasks = base_tasks[:2] + ["Reflect: write notes on key learnings"]
        
        # Generate learning resources for this week
        learning_resources = []
        if skill:
            learning_resources = get_learning_resources(skill, milestone)
        
        weeks.append({
            "week": len(weeks) + 1, 
            "milestone": milestone, 
            "tasks": base_tasks,
            "learning_resources": learning_resources
        })

    # For each prioritized skill, allocate Foundations and Project
    for skill in prioritized:
        add_week(
            f"Foundations: {skill}",
            [
                f"Read the official {skill} docs and summarize key concepts",
                f"Complete a beginner tutorial/course for {skill}",
                f"Practice: implement 2-3 small exercises using {skill}",
            ],
            skill
        )
        add_week(
            f"Project: Build with {skill}",
            [
                f"Design and build a mini app using {skill}",
                f"Add tests (unit/integration) and linting for the project",
                f"Document learnings and challenges; push to a public repo",
            ],
            skill
        )
        # If interview flagged this topic as weak, add reinforcement
        if any(skill.lower() in t.lower() for t in weak_topics):
            add_week(
                f"Reinforcement: {skill}",
                [
                    f"Targeted practice on weak areas in {skill} (based on interview)",
                    f"Implement a small feature addressing an identified gap in {skill}",
                    f"Summarize lessons learned and update your notes",
                ],
                skill
            )

    # Capstone week combining all skills; adjust scope by average interview score
    combo = ", ".join(prioritized)
    capstone_resources = [
        {"title": "Portfolio Project Ideas", "url": "https://github.com/practical-tutorials/project-based-learning", "type": "project-ideas"},
        {"title": "Clean Architecture Guide", "url": "https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html", "type": "guide"},
        {"title": "CI/CD Best Practices", "url": "https://docs.github.com/en/actions/learn-github-actions", "type": "documentation"}
    ]
    
    add_week(
        f"Capstone: Integrate {combo}",
        [
            "Plan a portfolio-level project combining the learned skills",
            "Implement core features, focusing on clean architecture",
            "Add basic CI (tests) and deploy locally or to a free tier",
        ]
        + (["Stretch: add an advanced feature and write a postmortem"] if avg_score >= 70 else [])
        + (["Scope down and solidify fundamentals before expanding"] if avg_score < 50 else []),
    )
    # Manually add capstone resources
    if weeks:
        weeks[-1]["learning_resources"] = capstone_resources

    # Final assessment & reflection; emphasize strengths for showcase
    showcase = ", ".join(strength_topics[:3]) if strength_topics else "key concepts"
    assessment_resources = [
        {"title": "How to Write a Great README", "url": "https://www.makeareadme.com/", "type": "guide"},
        {"title": "Creating Demo Videos", "url": "https://www.loom.com/", "type": "tool"},
        {"title": "Technical Interview Stories", "url": "https://www.pramp.com/blog/how-to-tell-your-story-during-a-technical-interview", "type": "guide"}
    ]
    
    add_week(
        "Assessment & Reflection",
        [
            "Create a README and short demo video of the capstone",
            f"Write a blog/notes highlighting {showcase}",
            "Prepare interview stories around the project (problem, approach, impact)",
        ],
    )
    # Manually add assessment resources
    if weeks:
        weeks[-1]["learning_resources"] = assessment_resources

    return {"roadmap": weeks}

# ---- Voice Interview Endpoints ----
@app.post("/interview/start")
async def interview_start(req: InterviewStartRequest):
    role = (req.target_role or "").lower()
    resume_text = req.resume_text or ""
    
    # Generate resume-based questions if resume is available
    if resume_text:
        questions = generate_resume_based_questions(resume_text, role, req.skills)
    else:
        # Fallback to role-based questions
        questions = generate_role_based_questions(role)
    
    return {"questions": questions}

@app.post("/interview/start-detailed")
async def interview_start_detailed(req: DetailedInterviewRequest):
    """Generate interview questions using detailed resume analysis"""
    role = (req.target_role or "").lower()
    resume_text = req.resume_text or ""
    resume_analysis = req.resume_analysis or {}
    
    # Generate enhanced questions using detailed resume analysis
    if resume_text and resume_analysis:
        questions = generate_detailed_resume_questions(resume_text, role, req.skills, resume_analysis)
    elif resume_text:
        questions = generate_resume_based_questions(resume_text, role, req.skills)
    else:
        # Fallback to role-based questions
        questions = generate_role_based_questions(role)
    
    return {"questions": questions}

def generate_resume_based_questions(resume_text: str, role: str, skills: list[str]) -> list[str]:
    """Generate personalized interview questions based on resume content"""
    resume_lower = resume_text.lower()
    questions = []
    
    # Extract specific details from resume for more targeted questions
    project_keywords = ["project", "built", "developed", "implemented", "created", "designed", "deployed", "architected"]
    has_projects = any(keyword in resume_lower for keyword in project_keywords)
    
    # Extract technologies mentioned in resume with more comprehensive detection
    tech_stack = []
    technologies = {
        "react": "React",
        "node": "Node.js", 
        "express": "Express",
        "mongodb": "MongoDB",
        "python": "Python",
        "docker": "Docker",
        "aws": "AWS",
        "javascript": "JavaScript",
        "typescript": "TypeScript",
        "tailwind": "TailwindCSS",
        "css": "CSS",
        "html": "HTML",
        "sql": "SQL",
        "git": "Git",
        "api": "API",
        "rest": "REST API",
        "graphql": "GraphQL",
        "redux": "Redux",
        "vue": "Vue.js",
        "angular": "Angular",
        "kubernetes": "Kubernetes",
        "jenkins": "Jenkins",
        "ci/cd": "CI/CD",
        "microservices": "Microservices",
        "redis": "Redis",
        "postgresql": "PostgreSQL",
        "mysql": "MySQL"
    }
    
    for tech_key, tech_name in technologies.items():
        if tech_key in resume_lower:
            tech_stack.append(tech_name)
    
    # Extract experience indicators
    experience_indicators = {
        "years": ["year", "yr"],
        "senior_roles": ["senior", "lead", "principal", "architect", "manager", "director"],
        "achievements": ["reduced", "improved", "increased", "optimized", "delivered", "achieved"],
        "team_work": ["team", "collaborated", "mentored", "managed", "coordinated"],
        "scale": ["million", "thousand", "users", "requests", "traffic", "scale"]
    }
    
    # Analyze experience level and achievements
    has_senior_experience = any(role in resume_lower for role in experience_indicators["senior_roles"])
    has_achievements = any(achievement in resume_lower for achievement in experience_indicators["achievements"])
    has_team_experience = any(team_word in resume_lower for team_word in experience_indicators["team_work"])
    has_scale_experience = any(scale_word in resume_lower for scale_word in experience_indicators["scale"])
    
    # Generate personalized questions based on resume analysis
    
    # Project-specific questions
    if has_projects:
        if has_achievements:
            questions.append("I see you've delivered measurable results in your projects. Can you walk me through a specific project where you achieved significant improvements and explain your technical approach?")
        else:
            questions.append("Tell me about one of the most technically challenging projects on your resume. What obstacles did you face and how did you solve them?")
    
    # Technology-specific deep-dive questions
    if "react" in resume_lower:
        if "redux" in resume_lower or "state" in resume_lower:
            questions.append("I notice you have React and state management experience. Can you explain a complex state management scenario you've handled and why you chose your particular approach?")
        else:
            questions.append("Your resume shows React experience. Can you describe how you've optimized React applications for performance and what patterns you follow for component architecture?")
    
    if "node" in resume_lower or "express" in resume_lower:
        if "microservices" in resume_lower or "api" in resume_lower:
            questions.append("I see you have Node.js and API experience. How do you design scalable backend architectures, and what patterns do you use for error handling and logging?")
        else:
            questions.append("Your resume mentions Node.js. Can you explain how you handle asynchronous operations and what strategies you use for performance optimization?")
    
    if "mongodb" in resume_lower or "database" in resume_lower:
        if has_scale_experience:
            questions.append("I notice you have database experience with scale considerations. How do you approach database optimization for high-traffic applications?")
        else:
            questions.append("Tell me about your database design approach. How do you handle data modeling and ensure query performance?")
    
    if "docker" in resume_lower:
        if "kubernetes" in resume_lower or "orchestration" in resume_lower:
            questions.append("I see you have containerization and orchestration experience. Can you explain how you've implemented container orchestration and managed deployments?")
        else:
            questions.append("Your resume shows Docker experience. How do you approach containerization strategy and what benefits have you seen in your projects?")
    
    if "aws" in resume_lower or "cloud" in resume_lower:
        if "security" in resume_lower or "iam" in resume_lower:
            questions.append("I notice cloud and security experience on your resume. How do you implement security best practices in cloud environments and manage access controls?")
        else:
            questions.append("Tell me about your cloud architecture experience. How do you design for scalability and cost optimization in cloud environments?")
    
    # Experience and leadership questions
    if has_senior_experience:
        if has_team_experience:
            questions.append("Based on your leadership experience, how do you approach technical decision-making in a team environment and ensure knowledge sharing?")
        else:
            questions.append("I see you have senior-level experience. How do you approach code reviews and maintaining technical standards across projects?")
    
    if has_team_experience and not has_senior_experience:
        questions.append("I notice you have collaborative experience. How do you handle technical disagreements in a team and ensure effective communication?")
    
    # Achievement-based questions
    if has_achievements:
        questions.append("Your resume shows measurable achievements. Can you describe a specific optimization or improvement you made and walk me through your problem-solving process?")
    
    # Scale and performance questions
    if has_scale_experience:
        questions.append("I see you've worked with large-scale systems. What challenges have you faced with performance and scalability, and how did you address them?")
    
    if "startup" in resume_lower or "entrepreneur" in resume_lower:
        questions.append("I see you have startup experience. How do you balance rapid development with maintaining code quality and technical debt?")
    
    # Add role-specific questions to complement resume-based ones
    role_questions = generate_role_based_questions(role)
    
    # Combine resume-based and role-based questions, ensuring we have 3-5 questions total
    all_questions = questions + role_questions
    return all_questions[:5]  # Limit to 5 questions

def generate_detailed_resume_questions(resume_text: str, role: str, skills: list[str], resume_analysis: dict) -> list[str]:
    """Generate highly personalized interview questions using detailed resume analysis"""
    questions = []
    
    # Extract data from resume analysis
    detected_skills = resume_analysis.get('detectedSkills', [])
    missing_skills = resume_analysis.get('missingSkills', [])
    strengths = resume_analysis.get('strengths', [])
    weaknesses = resume_analysis.get('weaknesses', [])
    role_fit = resume_analysis.get('roleFit', 0)
    resume_score = resume_analysis.get('score', 0)
    
    # Generate questions based on detected skills and experience
    if detected_skills:
        # Pick top 2-3 skills for deep dive questions
        top_skills = detected_skills[:3]
        for skill in top_skills:
            skill_lower = skill.lower()
            if 'react' in skill_lower:
                questions.append(f"I see you have {skill} experience on your resume. Can you describe a complex React application you've built and explain your approach to state management and component optimization?")
            elif 'node' in skill_lower or 'javascript' in skill_lower:
                questions.append(f"Your resume shows {skill} expertise. Can you walk me through how you've handled scalability challenges in Node.js applications and your approach to asynchronous programming?")
            elif 'python' in skill_lower:
                questions.append(f"I notice {skill} on your resume. Can you describe a Python project where you had to optimize performance and explain your debugging process?")
            elif 'database' in skill_lower or 'sql' in skill_lower or 'mongodb' in skill_lower:
                questions.append(f"Your {skill} experience is evident on your resume. How do you approach database schema design and what strategies do you use for query optimization?")
            elif 'docker' in skill_lower or 'kubernetes' in skill_lower:
                questions.append(f"I see {skill} experience listed. Can you explain how you've implemented containerization in production environments and handled deployment challenges?")
            elif 'aws' in skill_lower or 'cloud' in skill_lower:
                questions.append(f"Your resume mentions {skill}. How do you design cloud architectures for scalability and what security practices do you implement?")
    
    # Generate questions based on missing skills (areas for growth)
    if missing_skills and len(missing_skills) > 0:
        # Pick 1-2 missing skills to explore learning approach
        key_missing = missing_skills[:2]
        for missing_skill in key_missing:
            questions.append(f"I notice {missing_skill} isn't prominently featured on your resume but is important for this role. How would you approach learning {missing_skill} and integrating it into your current skill set?")
    
    # Generate questions based on strengths
    if strengths:
        strength_text = ', '.join(strengths[:2])
        questions.append(f"Your resume highlights strengths in {strength_text}. Can you provide a specific example of how you've leveraged these strengths to solve a complex technical problem?")
    
    # Generate questions based on weaknesses (areas for improvement)
    if weaknesses:
        weakness_text = ', '.join(weaknesses[:2])
        questions.append(f"Looking at areas for growth like {weakness_text}, how do you typically approach improving in areas where you want to develop further?")
    
    # Role fit based questions
    if role_fit < 70:
        questions.append("Based on your background, what aspects of this role excite you most, and how do you plan to bridge any skill gaps to excel in this position?")
    elif role_fit >= 85:
        questions.append("Your background seems well-aligned with this role. What unique perspective or advanced techniques would you bring to elevate the team's technical capabilities?")
    
    # Resume score based questions
    if resume_score < 70:
        questions.append("What recent projects or learning experiences have you had that might not be fully reflected on your resume but demonstrate your growth as a developer?")
    
    # Add some general behavioral questions that reference their specific background
    if detected_skills:
        primary_tech = detected_skills[0] if detected_skills else "your primary technology"
        questions.append(f"Describe a time when you had to learn a new technology quickly to complement your {primary_tech} skills. How did you approach the learning process?")
    
    # Ensure we have enough questions by adding role-based ones if needed
    if len(questions) < 3:
        role_questions = generate_role_based_questions(role)
        questions.extend(role_questions)
    
    # Return 4-6 questions for a comprehensive interview
    return questions[:6]

def generate_role_based_questions(role: str) -> list[str]:
    """Generate standard role-based questions as fallback"""
    if "full" in role and "stack" in role:
        return [
            "Explain how React's component state and hooks work together to manage UI state.",
            "Describe the Node.js event loop and how it impacts asynchronous code.",
            "How would you design a REST API with Express and MongoDB, including schema considerations?",
            "What are Docker containers and images, and how would you containerize a Node/React app?",
            "How do you secure AWS resources (e.g., S3, EC2) using IAM best practices?",
        ]
    elif "frontend" in role:
        return [
            "What are React hooks and when would you use useEffect vs useMemo?",
            "How do you optimize performance in a large React app (code splitting, memoization)?",
            "Explain how CSS frameworks like TailwindCSS can improve developer productivity.",
        ]
    elif "backend" in role:
        return [
            "Explain the Node.js event loop and non-blocking I/O.",
            "How would you design scalable APIs with Express, including auth and rate limiting?",
            "Discuss database indexing strategies in MongoDB to improve query performance.",
        ]
    else:
        return [
            "Tell me about a project you built and what you learned.",
            "How do you approach debugging complex issues?",
            "Describe how you collaborate in a team setting.",
        ]

@app.post("/interview/score")
async def interview_score(req: InterviewScoreRequest):
    q = (req.question or "").lower()
    a = (req.answer or "").lower()
    topics = {
        "react": ["component", "state", "props", "hooks", "useeffect", "usememo"],
        "node": ["event loop", "async", "await", "express", "non-blocking"],
        "mongodb": ["schema", "index", "aggregation", "document", "collection"],
        "docker": ["container", "image", "compose", "registry"],
        "aws": ["ec2", "s3", "iam", "security", "vpc"],
        "tailwind": ["utility", "class", "responsive", "css"],
        "api": ["rest", "http", "auth", "rate limit", "jwt"],
    }
    # Determine topic from question
    selected_keys = [k for k in topics.keys() if k in q]
    if not selected_keys:
        selected_keys = ["api"]
    keywords = [kw for k in selected_keys for kw in topics[k]]
    matches = sum(1 for kw in keywords if kw in a)
    total = max(5, len(keywords))
    base_score = int((matches / total) * 100)
    # Add small bonus for longer answers
    bonus = min(20, len(a) // 50)
    score = max(0, min(100, base_score + bonus))
    feedback = "Good coverage of key concepts." if score >= 70 else (
        "Decent answer, consider elaborating on core concepts mentioned in the question." if score >= 40 else
        "Try to address the core concepts directly and provide concrete examples."
    )
    return {"score": score, "feedback": feedback}

# ---- Resume Analysis Endpoint ----
@app.post("/resume/analyze")
async def resume_analyze(req: ResumeAnalyzeRequest):
    text = (req.text or "")
    role = (req.target_role or "").lower()

    known_skills = [
        "JavaScript","React","Node.js","Express","MongoDB","Python","FastAPI","Docker","AWS","NLP","TailwindCSS"
    ]
    # Simple keyword scan for skills present
    lt = text.lower()
    extracted = [s for s in known_skills if s.lower() in lt]

    # Role-aware desired skill sets
    if "frontend" in role:
        desired = ["React", "TailwindCSS"]
    elif "backend" in role:
        desired = ["Node.js", "Express", "MongoDB", "Docker"]
    elif ("full" in role and "stack" in role) or "full-stack" in role:
        desired = ["React", "TailwindCSS", "Node.js", "Express", "MongoDB", "Docker", "AWS"]
    elif "ml" in role:
        desired = ["Python", "NLP", "Docker", "AWS"]
    elif "data" in role and "scientist" in role:
        desired = ["Python", "NLP", "AWS", "MongoDB"]
    else:
        desired = ["React","Node.js","MongoDB","Docker","AWS"]

    recommended = [s for s in desired if s not in extracted]

    # Signals for strengths/weaknesses
    lt = text.lower()
    has_metrics = any(k in lt for k in ["%", "percent", "increased", "decreased", "improved", "reduced", "growth", "roi"]) or any(ch.isdigit() for ch in text)
    has_projects = any(k in lt for k in ["project", "built", "developed", "implemented", "deployed", "launched"])
    structure_hits = sum(1 for k in ["experience", "education", "skills", "projects", "summary"] if k in lt)
    well_structured = structure_hits >= 2
    words = max(1, len(text.split()))
    good_length = 200 <= words <= 1500

    # Basic fit score based on coverage of desired skills
    fit = int(100 * (len(desired) - len(recommended)) / max(1, len(desired)))

    # Resume score out of 10 combining fit + signals
    score_base = (fit / 100.0) * 6.0
    bonus = 0.0
    if has_metrics:
        bonus += 1.0
    if well_structured:
        bonus += 1.0
    if has_projects:
        bonus += 1.0
    if good_length:
        bonus += 1.0
    resume_score = int(max(0, min(10, round(score_base + bonus))))

    # Detailed strengths analysis
    strengths = []
    if extracted:
        strengths.append(f"TECHNICAL PROFICIENCY: Demonstrates solid command of {len(extracted)} key technologies including {', '.join(extracted[:4])}{'...' if len(extracted) > 4 else ''}. This technical foundation aligns well with industry standards.")
    if has_metrics:
        strengths.append("QUANTIFIED ACHIEVEMENTS: Excellent use of specific metrics, percentages, and measurable outcomes that clearly demonstrate impact and value delivered to previous organizations.")
    if has_projects:
        strengths.append("PROJECT PORTFOLIO: Strong showcase of hands-on development experience with practical implementations, indicating ability to translate technical skills into real-world solutions.")
    if well_structured:
        strengths.append("PROFESSIONAL PRESENTATION: Well-organized resume structure with clear sections, making it easy for recruiters and ATS systems to parse and evaluate your qualifications.")
    if good_length:
        strengths.append("OPTIMAL CONTENT LENGTH: Appropriate resume length that provides comprehensive information without overwhelming the reader, demonstrating good communication skills.")
    
    # Detailed weaknesses with actionable recommendations
    weaknesses = []
    if recommended:
        critical_missing = recommended[:3]
        weaknesses.append(f"SKILL GAPS: Missing {len(recommended)} critical skills for this role, particularly {', '.join(critical_missing)}. Consider online courses, bootcamps, or personal projects to develop these competencies.")
    if not has_metrics:
        weaknesses.append("IMPACT QUANTIFICATION: Lacks specific numbers and measurable achievements. Add metrics like 'Improved performance by 25%', 'Reduced load time by 40%', or 'Managed team of 5 developers' to demonstrate concrete value.")
    if not has_projects:
        weaknesses.append("PROJECT SHOWCASE: Limited evidence of practical application. Include 2-3 recent projects with technology stack, challenges solved, and outcomes achieved to demonstrate hands-on experience.")
    if not well_structured:
        weaknesses.append("STRUCTURAL CLARITY: Resume organization needs improvement. Ensure clear sections for Professional Experience, Technical Skills, Education, and Projects with consistent formatting throughout.")
    if not good_length:
        if words < 200:
            weaknesses.append("CONTENT DEPTH: Resume appears too brief. Expand with more detailed descriptions of responsibilities, achievements, and technical implementations to reach 1-2 pages.")
        else:
            weaknesses.append("CONTENT CONCISENESS: Resume may be too lengthy. Focus on most relevant experiences and achievements, removing outdated or less relevant information to improve readability.")

    # Generate comprehensive detailed analysis
    executive_summary = f"""
EXECUTIVE SUMMARY:
This resume analysis evaluates your candidacy for the {req.target_role or 'target'} role. Your current profile demonstrates {len(extracted)} relevant technical skills with a {fit}% role alignment score. The overall resume quality scores {resume_score}/10 based on technical competency, quantified achievements, project demonstrations, and structural clarity.

TECHNICAL COMPETENCY ASSESSMENT:
Your resume showcases proficiency in {len(extracted)} key technologies: {', '.join(extracted[:8]) if extracted else 'Limited technical skills detected'}. For the {req.target_role or 'target'} position, you're missing {len(recommended)} critical skills that could significantly impact your candidacy.

CONTENT QUALITY EVALUATION:
{'Strong quantified achievements detected - excellent use of metrics and impact statements.' if has_metrics else 'Missing quantified achievements - consider adding specific numbers, percentages, and measurable outcomes.'}
{'Demonstrates hands-on project experience effectively.' if has_projects else 'Limited project showcase - highlight recent development work and technical implementations.'}
{'Well-structured with clear sections and professional formatting.' if well_structured else 'Structure needs improvement - ensure clear Experience, Education, and Skills sections.'}
{'Appropriate length for comprehensive review.' if good_length else 'Length optimization needed - aim for 1-2 pages with focused, relevant content.'}

ATS COMPATIBILITY & KEYWORD ANALYSIS:
Your resume contains {len([s for s in extracted if s.lower() in text.lower()])} of {len(desired)} target keywords for this role. Missing keywords that could improve ATS ranking: {', '.join(recommended[:5]) if recommended else 'None - excellent keyword coverage'}.

SCORING BREAKDOWN:
• Technical Skills Match: {int((len(extracted)/max(1,len(desired)))*100)}% ({len(extracted)}/{len(desired)} skills)
• Achievement Quantification: {'✓ Strong' if has_metrics else '✗ Needs Improvement'}
• Project Demonstration: {'✓ Present' if has_projects else '✗ Missing'}
• Structure & Formatting: {'✓ Professional' if well_structured else '✗ Needs Work'}
• Content Length: {'✓ Optimal' if good_length else '✗ Suboptimal'}

OVERALL RECOMMENDATION:
{'Strong candidate profile with minor optimizations needed.' if resume_score >= 7 else 'Good foundation requiring strategic improvements.' if resume_score >= 5 else 'Significant enhancements recommended before applying.'}
    """.strip()
    
    summary = executive_summary

    # Comprehensive recommendations and action items
    notes = []
    if recommended:
        priority_skills = recommended[:3]
        secondary_skills = recommended[3:6] if len(recommended) > 3 else []
        notes.append(f"PRIORITY SKILL DEVELOPMENT: Focus immediately on {', '.join(priority_skills)} as these are critical for the {req.target_role or 'target'} role. Recommended learning path: online courses → personal projects → portfolio showcase.")
        if secondary_skills:
            notes.append(f"SECONDARY SKILLS: Consider developing {', '.join(secondary_skills)} to further strengthen your candidacy and stand out from other applicants.")
    
    if extracted:
        notes.append(f"LEVERAGE EXISTING STRENGTHS: Your proficiency in {', '.join(extracted[:6])} is valuable. Consider highlighting specific projects or achievements using these technologies to demonstrate depth of experience.")
    
    # Additional strategic recommendations
    if resume_score < 7:
        notes.append("IMMEDIATE ACTIONS: 1) Add 2-3 quantified achievements per role, 2) Include links to GitHub/portfolio, 3) Tailor keywords to job descriptions, 4) Get feedback from industry professionals.")
    
    if fit < 70:
        notes.append(f"ROLE ALIGNMENT: Current {fit}% role fit suggests significant skill gaps. Consider targeting roles that better match your current skillset while developing missing competencies, or invest 3-6 months in intensive skill development.")
    
    notes.append("ATS OPTIMIZATION: Ensure your resume includes exact keyword matches from job postings, uses standard section headers, and is saved in both PDF and Word formats for different application systems.")

    return {
        "summary": summary,
        "targetRole": req.target_role,
        "fit": fit,
        "resume_score": resume_score,
        "extracted_skills": extracted,
        "missing_skills": recommended,
        "strengths": strengths,
        "weaknesses": weaknesses,
        "notes": notes,
    }