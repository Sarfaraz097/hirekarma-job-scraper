import { useState } from "react";
import {
  MapPin, ExternalLink, Bookmark, BookmarkCheck, Zap,
  Building2, Send, CheckCircle2
} from "lucide-react";
import { jobsApi } from "../../api/client";
import toast from "react-hot-toast";

interface Job {
  title: string;
  company: string;
  location?: string;
  platform: string;
  url: string;
  description?: string;
  ai_match_score?: number;
  ai_match_reason?: string;
  ai_source?: string;
}

interface JobCardProps {
  job: Job;
  isBookmarked?: boolean;
  isApplied?: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  LinkedIn: "platform-linkedin",
  Naukri: "platform-naukri",
  Internshala: "platform-internshala",
  Unstop: "platform-unstop",
};

function MatchBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-green-500" :
    score >= 45 ? "bg-yellow-500" :
    "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums ${
        score >= 70 ? "text-green-400" : score >= 45 ? "text-yellow-400" : "text-red-400"
      }`}>{score}%</span>
    </div>
  );
}

export default function JobCard({ job, isBookmarked = false, isApplied = false }: JobCardProps) {
  const [applied, setApplied] = useState(isApplied);
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [applyLoading, setApplyLoading] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const handleApply = async () => {
    if (applied || applyLoading) return;
    setApplyLoading(true);
    try {
      window.open(job.url, "_blank", "noopener,noreferrer");
      const result = await jobsApi.apply({
        job_title: job.title,
        company: job.company,
        location: job.location,
        platform: job.platform,
        job_url: job.url,
      });
      setApplied(true);
      if (!result.already_applied) {
        toast.success("Application recorded!");
      } else {
        toast("Already applied to this job", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Failed to record application");
    } finally {
      setApplyLoading(false);
    }
  };

  const handleBookmark = async () => {
    if (bookmarked || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      await jobsApi.bookmark({
        job_title: job.title,
        company: job.company,
        location: job.location,
        platform: job.platform,
        job_url: job.url,
        description: job.description,
      });
      setBookmarked(true);
      toast.success("Bookmarked! AI summary generated ✨");
    } catch (err: any) {
      if (err.response?.status === 409) {
        setBookmarked(true);
        toast("Already bookmarked", { icon: "🔖" });
      } else {
        toast.error("Failed to bookmark");
      }
    } finally {
      setBookmarkLoading(false);
    }
  };

  const score = job.ai_match_score;
  const hasScore = typeof score === "number";

  return (
    <div className="card group animate-fade-in hover:border-brand-500/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className={`badge ${PLATFORM_COLORS[job.platform] || "bg-gray-800 text-gray-300"}`}>
              {job.platform}
            </span>
            {applied && (
              <span className="badge bg-green-900/30 text-green-400 border border-green-500/20">
                <CheckCircle2 size={10} /> Applied
              </span>
            )}
          </div>
          <h3 className="font-semibold text-surface-50 text-sm leading-snug group-hover:text-brand-300 transition-colors line-clamp-2">
            {job.title}
          </h3>
          <div className="flex items-center gap-1 mt-1 text-surface-200/45 text-xs">
            <Building2 size={11} />
            <span className="truncate">{job.company}</span>
          </div>
        </div>
        <button
          onClick={handleBookmark}
          disabled={bookmarkLoading}
          className={`p-2 rounded-lg transition-all shrink-0 ${
            bookmarked
              ? "text-yellow-400 bg-yellow-900/20"
              : "text-surface-200/25 hover:text-yellow-400 hover:bg-yellow-900/20"
          }`}
          title={bookmarked ? "Bookmarked" : "Save job"}
        >
          {bookmarkLoading
            ? <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
            : bookmarked ? <BookmarkCheck size={17} /> : <Bookmark size={17} />
          }
        </button>
      </div>

      {/* Location */}
      {job.location && (
        <div className="flex items-center gap-1 text-surface-200/35 text-xs mb-3">
          <MapPin size={11} />
          <span className="truncate">{job.location}</span>
        </div>
      )}

      {/* AI Match Score — always shown */}
      {hasScore && (
        <div className="mb-3 p-2.5 rounded-xl bg-surface-800/60 border border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-surface-200/50 flex items-center gap-1">
              <Zap size={10} className="text-brand-400" />
              AI Match
              {job.ai_source === "gemini" && (
                <span className="text-brand-400/60 text-[10px]">· Gemini</span>
              )}
            </span>
          </div>
          <MatchBar score={score} />
          {job.ai_match_reason && (
            <p className="text-[11px] text-surface-200/40 mt-1.5 leading-relaxed">
              {job.ai_match_reason}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-3 border-t border-white/5">
        <button
          onClick={handleApply}
          disabled={applyLoading || applied}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
            applied
              ? "bg-green-900/20 text-green-400 border border-green-500/20 cursor-default"
              : "btn-primary"
          }`}
        >
          {applied ? (
            <><CheckCircle2 size={13} /> Applied</>
          ) : applyLoading ? (
            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Opening...</>
          ) : (
            <><Send size={13} /> Apply Now</>
          )}
        </button>
        <a
          href={job.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-xl border border-white/10 text-surface-200/40 hover:text-surface-50 hover:border-white/20 transition-all"
          title="View job posting"
        >
          <ExternalLink size={15} />
        </a>
      </div>
    </div>
  );
}
