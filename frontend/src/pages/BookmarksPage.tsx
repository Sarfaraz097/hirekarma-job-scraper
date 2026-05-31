import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, Trash2, Zap, Building2, MapPin, Sparkles } from "lucide-react";
import { jobsApi } from "../api/client";
import toast from "react-hot-toast";

interface BookmarkedJob {
  id: number;
  job_title: string;
  company: string;
  location?: string;
  platform: string;
  job_url: string;
  ai_summary?: string;
  ai_match_score?: number;
  bookmarked_at: string;
}

const PLATFORM_STYLES: Record<string, string> = {
  LinkedIn: "platform-linkedin",
  Naukri: "platform-naukri",
  Internshala: "platform-internshala",
  Unstop: "platform-unstop",
};

function MatchRing({ score }: { score: number }) {
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#eab308" : "#f87171";
  const r = 18, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-12 h-12 shrink-0">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="24" cy="24" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.7s ease" }} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  );
}

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<BookmarkedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi.getBookmarks()
      .then((r) => setBookmarks(r.bookmarks))
      .catch(() => toast.error("Failed to load bookmarks"))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (id: number) => {
    if (!confirm("Remove this bookmark?")) return;
    try {
      await jobsApi.removeBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success("Bookmark removed");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-9 w-44 shimmer-bg rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="card h-40 shimmer-bg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Bookmarks</h1>
          <p className="text-surface-200/50 mt-1">
            {bookmarks.length} saved job{bookmarks.length !== 1 ? "s" : ""} · AI summaries included
          </p>
        </div>
        {bookmarks.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-900/30 border border-brand-500/20">
            <Zap size={13} className="text-brand-400" />
            <span className="text-xs font-medium text-brand-400">AI Summaries</span>
          </div>
        )}
      </div>

      {bookmarks.length === 0 ? (
        <div className="card text-center py-24">
          <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mx-auto mb-4">
            <Bookmark size={28} className="text-surface-200/20" />
          </div>
          <h3 className="text-lg font-semibold text-surface-50 mb-2">No bookmarks yet</h3>
          <p className="text-surface-200/40 text-sm max-w-xs mx-auto">
            Save jobs from the search page. Each bookmark gets an AI-generated summary automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bookmarks.map((bm) => (
            <div key={bm.id} className="card animate-fade-in hover:border-brand-500/15 transition-all duration-300 flex flex-col">

              {/* Top row: score ring + title + delete */}
              <div className="flex items-start gap-3 mb-4">
                {typeof bm.ai_match_score === "number" && (
                  <MatchRing score={bm.ai_match_score} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge ${PLATFORM_STYLES[bm.platform] || "bg-gray-800 text-gray-300"}`}>
                      {bm.platform}
                    </span>
                  </div>
                  <h3 className="font-semibold text-surface-50 text-sm leading-snug line-clamp-2">
                    {bm.job_title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-surface-200/40 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 size={11} />{bm.company}</span>
                    {bm.location && <span className="flex items-center gap-1"><MapPin size={11} />{bm.location}</span>}
                  </div>
                </div>
                <button
                  onClick={() => remove(bm.id)}
                  className="p-1.5 rounded-lg text-red-400/30 hover:text-red-400 hover:bg-red-900/10 transition-all shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* AI Summary — always present */}
              {bm.ai_summary && (
                <div className="flex-1 mb-4 px-3 py-3 rounded-xl bg-gradient-to-br from-brand-900/25 to-accent-900/10 border border-brand-500/15">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles size={12} className="text-brand-400" />
                    <span className="text-xs font-semibold text-brand-400">AI Summary</span>
                  </div>
                  <p className="text-xs text-surface-200/65 whitespace-pre-line leading-relaxed">
                    {bm.ai_summary}
                  </p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-auto">
                <span className="text-xs text-surface-200/25">Saved {formatDate(bm.bookmarked_at)}</span>
                <a
                  href={bm.job_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-brand-400 hover:text-brand-300 text-xs font-medium transition-colors"
                >
                  View Job <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
