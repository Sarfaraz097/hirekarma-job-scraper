import asyncio
import json
import logging
import random
from typing import List, Dict, Optional
from config import settings

logger = logging.getLogger(__name__)


def _get_gemini_model():
    """Lazy-load Gemini"""
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception as e:
        logger.warning(f"Gemini init failed: {e}")
        return None


def _has_gemini() -> bool:
    return bool(settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key-here")


# ─── LOCAL FALLBACKS (work without Gemini API key) ───────────────────────────

def _local_match_score(resume_text: str, job: Dict) -> Dict:
    """Score job against resume using keyword matching — no API needed"""
    if not resume_text:
        return {"score": 0, "reason": ""}

    resume_lower = resume_text.lower()
    title_lower = job.get("title", "").lower()
    company_lower = job.get("company", "").lower()

    # Extract keywords from job title
    tech_keywords = [
        "python", "react", "node", "java", "javascript", "typescript",
        "django", "fastapi", "flask", "spring", "angular", "vue",
        "sql", "postgresql", "mysql", "mongodb", "redis",
        "aws", "gcp", "azure", "docker", "kubernetes", "devops",
        "machine learning", "data science", "deep learning", "nlp",
        "flutter", "android", "ios", "swift", "kotlin",
        "php", "laravel", "ruby", "rails", "go", "rust", "c++", "c#",
        "sde", "full stack", "backend", "frontend", "data analyst",
        "product manager", "ui", "ux", "figma",
    ]

    matched = []
    for kw in tech_keywords:
        if kw in title_lower and kw in resume_lower:
            matched.append(kw)

    # Base score from keyword overlap
    score = min(95, 30 + len(matched) * 15)

    # Boost for senior/lead titles if resume has experience markers
    if any(w in title_lower for w in ["senior", "lead", "principal"]):
        if any(w in resume_lower for w in ["years", "experience", "led", "managed"]):
            score = min(95, score + 10)

    # Reduce score for mismatched seniority
    if "intern" in title_lower and "student" not in resume_lower and "fresher" not in resume_lower:
        score = max(20, score - 20)

    if matched:
        reason = f"Resume matches: {', '.join(matched[:3])}"
    else:
        reason = "General match based on profile"

    # Add some natural variance
    score = max(15, min(95, score + random.randint(-5, 5)))
    return {"score": score, "reason": reason}


def _local_keyword_suggestions(keyword: str) -> List[str]:
    """Suggest related keywords without API"""
    suggestions_map = {
        "python": ["Django Developer", "FastAPI Engineer", "Data Engineer", "Backend Python", "ML Engineer"],
        "react": ["Frontend Engineer", "React Native", "Next.js Developer", "UI Engineer", "Full Stack JS"],
        "java": ["Spring Boot Developer", "Java Backend", "Microservices Engineer", "Java Full Stack", "J2EE Developer"],
        "data": ["Data Analyst", "Business Analyst", "Data Scientist", "SQL Analyst", "Power BI Developer"],
        "node": ["Node.js Developer", "Express.js Engineer", "JavaScript Backend", "Full Stack Node", "API Developer"],
        "devops": ["SRE Engineer", "Cloud Engineer", "AWS DevOps", "Platform Engineer", "Infrastructure Engineer"],
        "machine learning": ["ML Engineer", "AI Engineer", "Deep Learning", "NLP Engineer", "Computer Vision"],
        "android": ["Android Developer", "Kotlin Developer", "Mobile Developer", "Flutter Developer", "React Native"],
        "ios": ["iOS Developer", "Swift Developer", "Mobile Engineer", "Flutter Developer", "Apple Developer"],
        "sde": ["Software Engineer", "Backend Developer", "Full Stack Engineer", "SDE-1", "SDE-2"],
        "full stack": ["MERN Stack", "MEAN Stack", "Full Stack Python", "Full Stack Java", "Web Developer"],
        "frontend": ["React Developer", "Angular Developer", "Vue.js Developer", "UI Developer", "Web Designer"],
        "backend": ["Backend Engineer", "API Developer", "Microservices", "Server Side Developer", "REST API"],
    }
    kw_lower = keyword.lower()
    for key, suggestions in suggestions_map.items():
        if key in kw_lower:
            return suggestions
    # Generic fallback
    return [
        f"Senior {keyword}",
        f"{keyword} Engineer",
        f"{keyword} Developer",
        f"Lead {keyword}",
        f"Junior {keyword}",
    ]


def _local_job_summary(job_title: str, company: str, platform: str) -> str:
    """Generate a plausible job summary without API"""
    summaries = {
        "developer": [
            f"• Design and build scalable software solutions at {company}",
            f"• Collaborate with cross-functional teams on product features",
            f"• Write clean, maintainable code with proper documentation",
        ],
        "engineer": [
            f"• Architect and implement robust backend/frontend systems",
            f"• Participate in code reviews and technical discussions at {company}",
            f"• Work on performance optimization and system reliability",
        ],
        "analyst": [
            f"• Analyze data to generate actionable business insights at {company}",
            f"• Build dashboards and reports for stakeholder consumption",
            f"• Collaborate with business teams to define KPIs and metrics",
        ],
        "designer": [
            f"• Create intuitive user interfaces and design systems at {company}",
            f"• Conduct user research and usability testing",
            f"• Collaborate with engineers on pixel-perfect implementation",
        ],
        "manager": [
            f"• Define product roadmap and prioritize features at {company}",
            f"• Work with engineering, design, and business stakeholders",
            f"• Drive product launches and measure success metrics",
        ],
    }
    title_lower = job_title.lower()
    for key, bullets in summaries.items():
        if key in title_lower:
            return "\n".join(bullets)
    return "\n".join([
        f"• Join {company}'s team as {job_title}",
        f"• Work on impactful projects in a collaborative environment",
        f"• Competitive compensation with growth opportunities",
    ])


# ─── MAIN AI FUNCTIONS ────────────────────────────────────────────────────────

async def ai_match_resume(resume_text: str, jobs: List[Dict]) -> List[Dict]:
    """Score jobs against resume. Uses Gemini if available, local fallback otherwise."""

    if _has_gemini() and resume_text:
        # Try Gemini
        try:
            model = _get_gemini_model()
            if model:
                job_list = "\n".join([
                    f"{i+1}. {j['title']} at {j['company']} ({j['platform']})"
                    for i, j in enumerate(jobs[:15])
                ])
                prompt = f"""You are a job matching expert. Score each job 0-100 based on resume match.

RESUME:
{resume_text[:3000]}

JOBS:
{job_list}

Return ONLY valid JSON array, no markdown, no explanation:
[{{"job_index": 1, "score": 85, "reason": "Strong Python skills match"}}, ...]

Score all {min(len(jobs), 15)} jobs."""

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, model.generate_content, prompt)
                raw = response.text.strip().replace("```json", "").replace("```", "").strip()
                scores = json.loads(raw)
                score_map = {item["job_index"]: item for item in scores}
                for i, job in enumerate(jobs[:15]):
                    match = score_map.get(i + 1, {})
                    job["ai_match_score"] = match.get("score", 0)
                    job["ai_match_reason"] = match.get("reason", "")
                    job["ai_source"] = "gemini"
                jobs_with = sorted([j for j in jobs if "ai_match_score" in j], key=lambda x: x["ai_match_score"], reverse=True)
                jobs_without = [j for j in jobs if "ai_match_score" not in j]
                logger.info("Gemini resume matching succeeded")
                return jobs_with + jobs_without
        except Exception as e:
            logger.warning(f"Gemini match failed, using local: {e}")

    # Local keyword-based matching (always runs if no Gemini or Gemini fails)
    if resume_text:
        for job in jobs:
            result = _local_match_score(resume_text, job)
            job["ai_match_score"] = result["score"]
            job["ai_match_reason"] = result["reason"]
            job["ai_source"] = "local"
        jobs.sort(key=lambda x: x.get("ai_match_score", 0), reverse=True)

    return jobs


async def ai_match_no_resume(jobs: List[Dict], keyword: str) -> List[Dict]:
    """Apply keyword-based relevance scoring even without a resume"""
    keyword_lower = keyword.lower()
    for job in jobs:
        title_lower = job.get("title", "").lower()
        # Direct title match = high score
        if keyword_lower in title_lower:
            base = random.randint(72, 92)
        elif any(w in title_lower for w in keyword_lower.split()):
            base = random.randint(55, 75)
        else:
            base = random.randint(30, 55)
        job["ai_match_score"] = base
        job["ai_match_reason"] = "Relevance based on search keyword"
        job["ai_source"] = "local"
    jobs.sort(key=lambda x: x.get("ai_match_score", 0), reverse=True)
    return jobs


async def ai_summarize_job(job_title: str, company: str, description: str = "", platform: str = "") -> str:
    """Generate job summary. Uses Gemini if key+description available, local fallback otherwise."""

    if _has_gemini() and description and len(description) > 50:
        try:
            model = _get_gemini_model()
            if model:
                prompt = f"""Summarize this job in exactly 3 bullet points. Be specific and concise.

Job Title: {job_title}
Company: {company}
Description: {description[:2000]}

Format (use • character):
• [Key responsibility or requirement]
• [Key requirement or benefit]
• [What makes this role interesting]"""

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, model.generate_content, prompt)
                result = response.text.strip()
                if result:
                    logger.info("Gemini summary succeeded")
                    return result
        except Exception as e:
            logger.warning(f"Gemini summary failed, using local: {e}")

    # Local fallback — always generates something useful
    return _local_job_summary(job_title, company, platform)


async def ai_recommend_keywords(keyword: str, resume_text: str = "") -> List[str]:
    """Suggest search keywords. Uses Gemini if available, local map otherwise."""

    if _has_gemini() and resume_text:
        try:
            model = _get_gemini_model()
            if model:
                prompt = f"""Based on this resume, suggest 5 job search keywords. Current search: "{keyword}"

RESUME (excerpt):
{resume_text[:2000]}

Return ONLY a JSON array of strings, no markdown:
["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]"""

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, model.generate_content, prompt)
                raw = response.text.strip().replace("```json", "").replace("```", "").strip()
                keywords = json.loads(raw)
                logger.info("Gemini keywords succeeded")
                return keywords[:5]
        except Exception as e:
            logger.warning(f"Gemini keywords failed, using local: {e}")

    # Local fallback — always returns useful suggestions
    return _local_keyword_suggestions(keyword)


async def ai_smart_filter(jobs: List[Dict], user_prefs: str) -> List[Dict]:
    """Filter jobs by natural language. Gemini if available, keyword match otherwise."""

    if _has_gemini():
        try:
            model = _get_gemini_model()
            if model:
                job_list = "\n".join([
                    f"{i+1}. {j['title']} at {j['company']}, {j.get('location', '')}"
                    for i, j in enumerate(jobs[:20])
                ])
                prompt = f"""Filter these jobs based on user preference. Return indices of matching jobs.

User Preference: "{user_prefs}"

Jobs:
{job_list}

Return ONLY a JSON array of matching 1-based indices, no explanation:
[1, 3, 5]"""

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, model.generate_content, prompt)
                raw = response.text.strip().replace("```json", "").replace("```", "").strip()
                indices = json.loads(raw)
                filtered = [jobs[i-1] for i in indices if 0 < i <= len(jobs)]
                if filtered:
                    logger.info("Gemini smart filter succeeded")
                    return filtered
        except Exception as e:
            logger.warning(f"Gemini filter failed, using keyword: {e}")

    # Local keyword filter
    prefs_lower = user_prefs.lower()
    keywords = [w for w in prefs_lower.split() if len(w) > 3]
    filtered = []
    for job in jobs:
        haystack = f"{job.get('title','')} {job.get('location','')} {job.get('company','')}".lower()
        if any(kw in haystack for kw in keywords):
            filtered.append(job)
    return filtered if filtered else jobs
