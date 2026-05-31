from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional, List
from database import get_db
from models.user import User
from models.job import JobApplication, BookmarkedJob
from utils.auth import get_current_user
from services.scraper import scrape_all_platforms
from services.ai_service import (
    ai_match_resume, ai_match_no_resume,
    ai_recommend_keywords, ai_summarize_job, ai_smart_filter
)

router = APIRouter(prefix="/jobs", tags=["jobs"])


class ScrapeRequest(BaseModel):
    keyword: str
    location: str
    smart_filter: Optional[str] = None


class ApplyRequest(BaseModel):
    job_title: str
    company: str
    location: Optional[str] = None
    platform: str
    job_url: str


class BookmarkRequest(BaseModel):
    job_title: str
    company: str
    location: Optional[str] = None
    platform: str
    job_url: str
    description: Optional[str] = None


class UpdateApplicationStatus(BaseModel):
    status: str


@router.post("/scrape")
async def scrape_jobs(
    data: ScrapeRequest,
    current_user: User = Depends(get_current_user),
):
    if not data.keyword.strip() or not data.location.strip():
        raise HTTPException(status_code=400, detail="Keyword and location are required")

    jobs = await scrape_all_platforms(data.keyword.strip(), data.location.strip())

    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found. Try different keywords.")

    # AI matching — always runs (uses resume if available, keyword-based if not)
    if current_user.resume_text:
        jobs = await ai_match_resume(current_user.resume_text, jobs)
        ai_mode = "resume"
    else:
        jobs = await ai_match_no_resume(jobs, data.keyword.strip())
        ai_mode = "keyword"

    # AI smart filter if provided
    if data.smart_filter and data.smart_filter.strip():
        jobs = await ai_smart_filter(jobs, data.smart_filter.strip())

    # AI keyword suggestions — always run
    keyword_suggestions = await ai_recommend_keywords(
        data.keyword.strip(),
        current_user.resume_text or ""
    )

    return {
        "jobs": jobs,
        "total": len(jobs),
        "ai_enhanced": True,      # always true now
        "ai_mode": ai_mode,       # "resume" or "keyword"
        "keyword_suggestions": keyword_suggestions,
    }


@router.post("/apply", status_code=201)
async def apply_to_job(
    data: ApplyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.user_id == current_user.id,
            JobApplication.job_url == data.job_url,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {"message": "Already applied", "application_id": existing.id, "already_applied": True}

    application = JobApplication(
        user_id=current_user.id,
        job_title=data.job_title,
        company=data.company,
        location=data.location,
        platform=data.platform,
        job_url=str(data.job_url),
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    return {"message": "Application recorded", "application_id": application.id, "already_applied": False}


@router.get("/applications")
async def get_applications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    platform: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    base_query = select(JobApplication).where(JobApplication.user_id == current_user.id)
    if platform:
        base_query = base_query.where(JobApplication.platform == platform)
    if status:
        base_query = base_query.where(JobApplication.status == status)

    count_result = await db.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar()

    result = await db.execute(
        base_query.order_by(JobApplication.applied_at.desc())
        .offset((page - 1) * per_page).limit(per_page)
    )
    applications = result.scalars().all()

    return {
        "applications": [
            {
                "id": app.id,
                "job_title": app.job_title,
                "company": app.company,
                "location": app.location,
                "platform": app.platform,
                "job_url": app.job_url,
                "status": app.status,
                "applied_at": app.applied_at.isoformat(),
                "notes": app.notes,
            }
            for app in applications
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
    }


@router.patch("/applications/{app_id}")
async def update_application(
    app_id: int,
    data: UpdateApplicationStatus,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == app_id,
            JobApplication.user_id == current_user.id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    valid_statuses = ["Applied", "Interview", "Rejected", "Offer", "Withdrawn"]
    if data.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {', '.join(valid_statuses)}")

    app.status = data.status
    db.add(app)
    await db.commit()
    return {"message": "Status updated", "status": app.status}


@router.delete("/applications/{app_id}")
async def delete_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobApplication).where(
            JobApplication.id == app_id,
            JobApplication.user_id == current_user.id,
        )
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    await db.delete(app)
    await db.commit()
    return {"message": "Application removed"}


@router.post("/bookmark", status_code=201)
async def bookmark_job(
    data: BookmarkRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BookmarkedJob).where(
            BookmarkedJob.user_id == current_user.id,
            BookmarkedJob.job_url == data.job_url,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Job already bookmarked")

    # AI summary — always generated (Gemini if key set, local fallback otherwise)
    ai_summary = await ai_summarize_job(
        job_title=data.job_title,
        company=data.company,
        description=data.description or "",
        platform=data.platform,
    )

    bookmark = BookmarkedJob(
        user_id=current_user.id,
        job_title=data.job_title,
        company=data.company,
        location=data.location,
        platform=data.platform,
        job_url=data.job_url,
        description=data.description,
        ai_summary=ai_summary,       # always has a value now
    )
    db.add(bookmark)
    await db.commit()
    await db.refresh(bookmark)
    return {"message": "Job bookmarked", "bookmark_id": bookmark.id, "ai_summary": ai_summary}


@router.delete("/bookmark/{bookmark_id}")
async def remove_bookmark(
    bookmark_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BookmarkedJob).where(
            BookmarkedJob.id == bookmark_id,
            BookmarkedJob.user_id == current_user.id,
        )
    )
    bm = result.scalar_one_or_none()
    if not bm:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    await db.delete(bm)
    await db.commit()
    return {"message": "Bookmark removed"}


@router.get("/bookmarks")
async def get_bookmarks(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(BookmarkedJob)
        .where(BookmarkedJob.user_id == current_user.id)
        .order_by(BookmarkedJob.bookmarked_at.desc())
    )
    bookmarks = result.scalars().all()
    return {
        "bookmarks": [
            {
                "id": bm.id,
                "job_title": bm.job_title,
                "company": bm.company,
                "location": bm.location,
                "platform": bm.platform,
                "job_url": bm.job_url,
                "ai_summary": bm.ai_summary,
                "ai_match_score": bm.ai_match_score,
                "bookmarked_at": bm.bookmarked_at.isoformat(),
            }
            for bm in bookmarks
        ],
        "total": len(bookmarks),
    }


@router.get("/stats")
async def get_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    apps_result = await db.execute(
        select(JobApplication).where(JobApplication.user_id == current_user.id)
    )
    apps = apps_result.scalars().all()

    bm_result = await db.execute(
        select(BookmarkedJob).where(BookmarkedJob.user_id == current_user.id)
    )
    bookmarks = bm_result.scalars().all()

    status_counts = {}
    platform_counts = {}
    for app in apps:
        status_counts[app.status] = status_counts.get(app.status, 0) + 1
        platform_counts[app.platform] = platform_counts.get(app.platform, 0) + 1

    return {
        "total_applications": len(apps),
        "total_bookmarks": len(bookmarks),
        "status_breakdown": status_counts,
        "platform_breakdown": platform_counts,
    }
