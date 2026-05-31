import { useState } from "react";
import {
  Search, Loader2, Zap, X, MapPin, Briefcase,
  Lightbulb, ChevronDown, LayoutGrid, List
} from "lucide-react";
import { jobsApi } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import JobCard from "../components/ui/JobCard";
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
}

const PLATFORMS = ["All", "LinkedIn", "Naukri", "Internshala", "Unstop"];
const SUGGESTED_KEYWORDS = ["React Developer", "Python Engineer", "Data Analyst", "Full Stack", "DevOps", "Machine Learning"];
const SUGGESTED_LOCATIONS = ["Bangalore", "Mumbai", "Delhi", "Hyderabad", "Pune", "Remote", "Chennai"];

export default function ScrapePage() {
  const { user } = useAuthStore();
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [smartFilter, setSmartFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filtered, setFiltered] = useState<Job[]>([]);
  const [activePlatform, setActivePlatform] = useState("All");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [hasSearched, setHasSearched] = useState(false);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim() || !location.trim()) {
      toast.error("Please enter keyword and location");
      return;
    }
    setLoading(true);
    setHasSearched(true);
    setActivePlatform("All");
    try {
      const result = await jobsApi.scrape({
        keyword: keyword.trim(),
        location: location.trim(),
        smart_filter: smartFilter.trim() || undefined,
      });
      setJobs(result.jobs);
      setFiltered(result.jobs);
      setAiSuggestions(result.keyword_suggestions || []);
      if (result.jobs.length === 0) {
        toast("No jobs found. Try different keywords.", { icon: "🔍" });
      } else {
        toast.success(`Found ${result.jobs.length} jobs • AI-ranked ⚡`);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Scraping failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const filterByPlatform = (platform: string) => {
    setActivePlatform(platform);
    if (platform === "All") {
      setFiltered(jobs);
    } else {
      setFiltered(jobs.filter((j) => j.platform === platform));
    }
  };

  const useSuggestion = (kw: string) => {
    setKeyword(kw);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-50">Find Jobs</h1>
        <p className="text-surface-200/50 mt-1">
          Search across LinkedIn, Naukri, Internshala & Unstop
          {user?.has_resume && (
            <span className="ml-2 inline-flex items-center gap-1 text-brand-400 text-xs font-medium">
              <Zap size={11} /> AI-enhanced
            </span>
          )}
        </p>
      </div>

      {/* Search form */}
      <div className="card">
        <form onSubmit={handleScrape} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-200/30" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="input-field pl-10"
                placeholder="Job title, skill, or keyword"
              />
            </div>
            <div className="relative">
              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-200/30" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-field pl-10"
                placeholder="City or Remote"
              />
            </div>
          </div>

          {/* AI smart filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-surface-200/50 hover:text-surface-200 transition-colors"
          >
            <Zap size={14} className="text-brand-400" />
            AI Smart Filter
            <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
          </button>

          {showFilters && (
            <div className="animate-slide-up">
              <input
                type="text"
                value={smartFilter}
                onChange={(e) => setSmartFilter(e.target.value)}
                className="input-field"
                placeholder="e.g. 'Only remote jobs with React and 2+ years experience'"
              />
              <p className="text-xs text-surface-200/30 mt-1.5 flex items-center gap-1">
                <Zap size={11} className="text-brand-400" />
                Gemini AI will filter results based on your natural language preference
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Scraping jobs...</>
              ) : (
                <><Search size={18} /> Scrape Jobs</>
              )}
            </button>
            {keyword && (
              <button type="button" onClick={() => { setKeyword(""); setLocation(""); setJobs([]); setFiltered([]); setHasSearched(false); }} className="btn-secondary px-4">
                <X size={18} />
              </button>
            )}
          </div>
        </form>

        {/* Quick suggestions */}
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTED_KEYWORDS.map((kw) => (
            <button
              key={kw}
              onClick={() => useSuggestion(kw)}
              className="text-xs px-3 py-1.5 rounded-full bg-surface-800 border border-white/5 text-surface-200/50 hover:text-surface-50 hover:border-brand-500/30 transition-all"
            >
              {kw}
            </button>
          ))}
        </div>

        {location === "" && (
          <div className="mt-2 flex flex-wrap gap-2">
            {SUGGESTED_LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className="text-xs px-3 py-1.5 rounded-full bg-surface-800 border border-white/5 text-surface-200/40 hover:text-surface-50 hover:border-brand-500/20 transition-all flex items-center gap-1"
              >
                <MapPin size={10} /> {loc}
              </button>
            ))}
          </div>
        )}

        {/* AI keyword suggestions */}
        {aiSuggestions.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-brand-900/20 border border-brand-500/10">
            <p className="text-xs text-brand-400 flex items-center gap-1 mb-2">
              <Lightbulb size={12} /> AI suggests these keywords for your resume:
            </p>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((kw) => (
                <button
                  key={kw}
                  onClick={() => useSuggestion(kw)}
                  className="text-xs px-3 py-1.5 rounded-full bg-brand-900/40 border border-brand-500/20 text-brand-300 hover:bg-brand-800/50 transition-all"
                >
                  {kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="animate-slide-up">
          {/* Controls */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-surface-200/50 text-sm">
                {filtered.length} job{filtered.length !== 1 ? "s" : ""} found
                <span className="ml-2 inline-flex items-center gap-1 text-brand-400 text-xs">
                  <Zap size={11} /> AI-ranked
                </span>
              </p>
              {loading && <Loader2 size={14} className="animate-spin text-brand-400" />}
            </div>

            <div className="flex items-center gap-2">
              {/* Platform filter */}
              <div className="flex items-center gap-1 bg-surface-800 rounded-xl p-1 border border-white/5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => filterByPlatform(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      activePlatform === p
                        ? "bg-brand-600 text-white"
                        : "text-surface-200/50 hover:text-surface-50"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 bg-surface-800 rounded-xl p-1 border border-white/5">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-surface-700 text-surface-50" : "text-surface-200/40"}`}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-surface-700 text-surface-50" : "text-surface-200/40"}`}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className={viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              : "space-y-3"
            }>
              {filtered.map((job, i) => (
                <JobCard key={`${job.url}-${i}`} job={job} />
              ))}
            </div>
          ) : (
            <div className="card text-center py-16">
              <Search size={40} className="text-surface-200/20 mx-auto mb-4" />
              <p className="text-surface-200/50">No jobs found for this filter</p>
              <button onClick={() => filterByPlatform("All")} className="btn-ghost mt-3 text-sm">
                Show all platforms
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasSearched && (
        <div className="card text-center py-20 border-dashed border-white/5">
          <div className="w-16 h-16 rounded-2xl bg-brand-900/20 flex items-center justify-center mx-auto mb-4">
            <Search size={28} className="text-brand-400" />
          </div>
          <h3 className="text-xl font-semibold text-surface-50 mb-2">Search for Jobs</h3>
          <p className="text-surface-200/40 text-sm max-w-sm mx-auto">
            Enter a job title and location to scrape listings from multiple platforms simultaneously
          </p>
        </div>
      )}
    </div>
  );
}
