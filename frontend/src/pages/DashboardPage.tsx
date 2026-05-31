import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Briefcase, Bookmark, TrendingUp, ArrowRight, Zap, Target } from "lucide-react";
import { jobsApi } from "../api/client";
import { useAuthStore } from "../stores/authStore";

interface Stats {
  total_applications: number;
  total_bookmarks: number;
  status_breakdown: Record<string, number>;
  platform_breakdown: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  Applied: "text-brand-400",
  Interview: "text-yellow-400",
  Rejected: "text-red-400",
  Offer: "text-green-400",
  Withdrawn: "text-gray-400",
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    jobsApi.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-50">
          {greeting}, {user?.full_name?.split(" ")[0]} 👋
        </h1>
        <p className="text-surface-200/50 mt-1">Here's your job search overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Applications",
            value: loading ? "—" : stats?.total_applications ?? 0,
            icon: Briefcase,
            color: "from-brand-600 to-brand-700",
            glow: "shadow-brand-900/40",
          },
          {
            label: "Bookmarks",
            value: loading ? "—" : stats?.total_bookmarks ?? 0,
            icon: Bookmark,
            color: "from-accent-500 to-accent-600",
            glow: "shadow-accent-900/40",
          },
          {
            label: "Interviews",
            value: loading ? "—" : stats?.status_breakdown?.Interview ?? 0,
            icon: Target,
            color: "from-yellow-500 to-orange-600",
            glow: "shadow-yellow-900/40",
          },
          {
            label: "Offers",
            value: loading ? "—" : stats?.status_breakdown?.Offer ?? 0,
            icon: TrendingUp,
            color: "from-green-500 to-emerald-600",
            glow: "shadow-green-900/40",
          },
        ].map(({ label, value, icon: Icon, color, glow }) => (
          <div key={label} className="card hover:scale-[1.02] transition-transform">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg ${glow} mb-3`}>
              <Icon size={19} className="text-white" />
            </div>
            <p className="text-2xl font-bold text-surface-50">{value}</p>
            <p className="text-sm text-surface-200/50 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-surface-50 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/scrape"
            className="card group hover:border-brand-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center mb-4">
              <Search size={20} className="text-brand-400" />
            </div>
            <h3 className="font-semibold text-surface-50 mb-1 group-hover:text-brand-300 transition-colors">Find Jobs</h3>
            <p className="text-sm text-surface-200/40 flex-1">Search across LinkedIn, Naukri, Internshala & Unstop</p>
            <div className="flex items-center gap-1.5 text-brand-400 text-sm font-medium mt-4">
              Start searching <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            to="/applications"
            className="card group hover:border-accent-500/30 hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center mb-4">
              <Briefcase size={20} className="text-accent-400" />
            </div>
            <h3 className="font-semibold text-surface-50 mb-1 group-hover:text-accent-300 transition-colors">Application History</h3>
            <p className="text-sm text-surface-200/40 flex-1">Track your applications and update statuses</p>
            <div className="flex items-center gap-1.5 text-accent-400 text-sm font-medium mt-4">
              View history <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            to="/bookmarks"
            className="card group hover:border-yellow-500/20 hover:-translate-y-1 transition-all duration-300 flex flex-col"
          >
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-4">
              <Bookmark size={20} className="text-yellow-400" />
            </div>
            <h3 className="font-semibold text-surface-50 mb-1 group-hover:text-yellow-300 transition-colors">Saved Jobs</h3>
            <p className="text-sm text-surface-200/40 flex-1">Review bookmarked jobs with AI summaries</p>
            <div className="flex items-center gap-1.5 text-yellow-400 text-sm font-medium mt-4">
              View saved <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </div>

      {/* Application status breakdown */}
      {stats && Object.keys(stats.status_breakdown).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-surface-50 mb-4">Application Breakdown</h2>
          <div className="card">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {Object.entries(stats.status_breakdown).map(([status, count]) => (
                <div key={status} className="text-center">
                  <p className={`text-2xl font-bold ${STATUS_COLORS[status] || "text-surface-50"}`}>{count}</p>
                  <p className="text-xs text-surface-200/40 mt-0.5">{status}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI features callout */}
      {!user?.has_resume && (
        <div className="card border border-brand-500/20 bg-brand-900/10">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0">
              <Zap size={19} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-surface-50 mb-1">Enable AI Job Matching</h3>
              <p className="text-sm text-surface-200/50 mb-3">
                Upload your resume to get AI-powered job match scores, smart recommendations, and personalized insights powered by Gemini.
              </p>
              <Link to="/profile" className="btn-primary inline-flex items-center gap-2 text-sm">
                Upload Resume <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
