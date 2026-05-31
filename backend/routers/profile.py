import base64
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from database import get_db
from models.user import User
from utils.auth import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = "uploads/avatars"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


@router.get("/")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "phone": current_user.phone,
        "location": current_user.location,
        "bio": current_user.bio,
        "avatar_url": current_user.avatar_url,
        "has_resume": bool(current_user.resume_text),
        "created_at": current_user.created_at.isoformat(),
    }


@router.patch("/")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.full_name is not None:
        if not data.full_name.strip():
            raise HTTPException(status_code=400, detail="Full name cannot be empty")
        current_user.full_name = data.full_name.strip()
    if data.phone is not None:
        current_user.phone = data.phone.strip() or None
    if data.location is not None:
        current_user.location = data.location.strip() or None
    if data.bio is not None:
        current_user.bio = data.bio.strip() or None

    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)

    return {
        "message": "Profile updated successfully",
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone,
            "location": current_user.location,
            "bio": current_user.bio,
            "avatar_url": current_user.avatar_url,
        },
    }


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF images allowed")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=400, detail="Image must be under 5MB")

    # Store as base64 data URL (works without file server)
    mime = file.content_type
    b64 = base64.b64encode(content).decode()
    data_url = f"data:{mime};base64,{b64}"

    # Delete old avatar file if stored on disk
    if current_user.avatar_url and current_user.avatar_url.startswith("/uploads/"):
        old_path = current_user.avatar_url.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    current_user.avatar_url = data_url
    db.add(current_user)
    await db.commit()

    return {"message": "Avatar uploaded", "avatar_url": data_url[:100] + "..."}


@router.delete("/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.avatar_url:
        raise HTTPException(status_code=404, detail="No avatar to delete")

    current_user.avatar_url = None
    db.add(current_user)
    await db.commit()
    return {"message": "Avatar deleted"}


@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in {"text/plain", "application/pdf"}:
        raise HTTPException(status_code=400, detail="Only TXT or PDF files allowed for resume")

    content = await file.read()
    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resume must be under 2MB")

    if file.content_type == "text/plain":
        resume_text = content.decode("utf-8", errors="ignore")
    else:
        # For PDF, store as text (basic extraction)
        try:
            import io
            resume_text = content.decode("latin-1", errors="ignore")
            # Strip binary chars
            resume_text = "".join(c for c in resume_text if c.isprintable() or c in "\n\t ")
        except Exception:
            resume_text = "[PDF content uploaded - text extraction limited]"

    current_user.resume_text = resume_text[:10000]  # Limit stored text
    db.add(current_user)
    await db.commit()
    return {"message": "Resume uploaded successfully", "has_resume": True}


@router.delete("/resume")
async def delete_resume(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.resume_text = None
    db.add(current_user)
    await db.commit()
    return {"message": "Resume deleted"}
