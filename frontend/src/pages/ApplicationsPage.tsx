import { useEffect, useState } from "react";
import { Briefcase, ExternalLink, Trash2, ChevronDown, Filter, RefreshCw, Building2, MapPin } from "lucide-react";
import { jobsApi } from "../api/client";
import toast from "react-hot-toast";

interface Application {
  id: number;
  job_title: string;
  company: string;
  location?: string;
  platform: string;
  job_url: string;
  status: string;
  applied_at: string;
  notes?: string;
}

const STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"];
const PLATFORMS = ["LinkedIn", "Naukri", "Internshala", "Unstop"];

const STATUS_STYLES: Record<string, string> = {
  Applied: "status-applied",
  Interview: "status-interview",
  Offer: "status-offer",
  Rejected: "status-rejected",
  Withdrawn: "status-withdrawn",
};

const PLATFORM_STYLES: Record<string, string> = {
  LinkedIn: "platform-linkedin",
  Naukri: "platform-naukri",
  Internshala: "platform-internshala",
  Unstop: "platform-unstop",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [platformFilter, setPlatformFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await jobsApi.getApplications({
        page,
        platform: platformFilter || undefined,
        status: statusFilter || undefined,
      });
      setApplications(result.applications);
      setTotalPages(result.pages);
    } catch {
      toast.error("Failed to load applications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, platformFilter, statusFilter]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await jobsApi.updateApplicationStatus(id, status);
      setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(`Status updated to ${status}`);
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteApp = async (id: number) => {
    if (!confirm("Remove this application?")) return;
    try {
      await jobsApi.deleteApplication(id);
      setApplications((prev) => prev.filter((a) => a.id !== id));
      toast.success("Application removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-surface-50">Applications</h1>
          <p className="text-surface-200/50 mt-1">Track your job application history</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter size={16} className="text-surface-200/40" />
          <select
            value={platformFilter}
            onChange={(e) => { setPlatformFilter(e.target.value); setPage(1); }}
            className="bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-surface-50 focus:outline-none focus:border-brand-500/60"
          >
            <option value="">All Platforms</option>
            {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-surface-50 focus:outline-none focus:border-brand-500/60"
          >
            <option value="">All Statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {(platformFilter || statusFilter) && (
            <button
              onClick={() => { setPlatformFilter(""); setStatusFilter(""); setPage(1); }}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-20 shimmer-bg" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="card text-center py-20">
          <Briefcase size={40} className="text-surface-200/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-50 mb-2">No applications yet</h3>
          <p className="text-surface-200/40 text-sm">Apply to jobs from the Find Jobs page to track them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="card hover:border-white/10 transition-all duration-200 animate-fade-in">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge ${PLATFORM_STYLES[app.platform] || "bg-gray-800 text-gray-300"}`}>
                      {app.platform}
                    </span>
                    <span className={`badge ${STATUS_STYLES[app.status] || "bg-gray-800 text-gray-300"}`}>
                      {app.status}
                    </span>
                  </div>
                  <h3 className="font-semibold text-surface-50 truncate">{app.job_title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-surface-200/40 flex-wrap">
                    <span className="flex items-center gap-1"><Building2 size={12} />{app.company}</span>
                    {app.location && <span className="flex items-center gap-1"><MapPin size={12} />{app.location}</span>}
                    <span>{formatDate(app.applied_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Status dropdown */}
                  <div className="relative">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      disabled={updatingId === app.id}
                      className="bg-surface-800 border border-white/10 rounded-lg px-3 py-2 text-xs text-surface-50 focus:outline-none focus:border-brand-500/60 cursor-pointer appearance-none pr-7"
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-200/40 pointer-events-none" />
                  </div>

                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg border border-white/10 text-surface-200/50 hover:text-surface-50 hover:border-white/20 transition-all"
                    title="View job"
                  >
                    <ExternalLink size={15} />
                  </a>

                  <button
                    onClick={() => deleteApp(app.id)}
                    className="p-2 rounded-lg border border-white/10 text-red-400/50 hover:text-red-400 hover:border-red-500/30 hover:bg-red-900/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                p === page
                  ? "bg-brand-600 text-white"
                  : "bg-surface-800 text-surface-200/50 hover:text-surface-50 border border-white/5"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
