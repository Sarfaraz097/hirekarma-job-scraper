from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String(300), nullable=False)
    company = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    platform = Column(String(50), nullable=False)
    job_url = Column(Text, nullable=False)
    status = Column(String(50), default="Applied")  # Applied, Interview, Rejected, Offer
    applied_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="applications")


class BookmarkedJob(Base):
    __tablename__ = "bookmarked_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_title = Column(String(300), nullable=False)
    company = Column(String(200), nullable=False)
    location = Column(String(200), nullable=True)
    platform = Column(String(50), nullable=False)
    job_url = Column(Text, nullable=False)
    description = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    ai_match_score = Column(Integer, nullable=True)  # 0-100
    bookmarked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="bookmarks")
