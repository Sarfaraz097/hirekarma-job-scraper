import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("hk_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("hk_token");
      localStorage.removeItem("hk_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  signup: (data: { full_name: string; email: string; password: string }) =>
    api.post("/auth/signup", data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};

// Profile
export const profileApi = {
  get: () => api.get("/profile/").then((r) => r.data),
  update: (data: Record<string, string>) =>
    api.patch("/profile/", data).then((r) => r.data),
  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/profile/avatar", fd).then((r) => r.data);
  },
  deleteAvatar: () => api.delete("/profile/avatar").then((r) => r.data),
  uploadResume: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post("/profile/resume", fd).then((r) => r.data);
  },
  deleteResume: () => api.delete("/profile/resume").then((r) => r.data),
};

// Jobs
export const jobsApi = {
  scrape: (data: { keyword: string; location: string; smart_filter?: string }) =>
    api.post("/jobs/scrape", data).then((r) => r.data),
  apply: (data: {
    job_title: string;
    company: string;
    location?: string;
    platform: string;
    job_url: string;
  }) => api.post("/jobs/apply", data).then((r) => r.data),
  getApplications: (params?: { page?: number; platform?: string; status?: string }) =>
    api.get("/jobs/applications", { params }).then((r) => r.data),
  updateApplicationStatus: (id: number, status: string) =>
    api.patch(`/jobs/applications/${id}`, { status }).then((r) => r.data),
  deleteApplication: (id: number) =>
    api.delete(`/jobs/applications/${id}`).then((r) => r.data),
  bookmark: (data: {
    job_title: string;
    company: string;
    location?: string;
    platform: string;
    job_url: string;
    description?: string;
  }) => api.post("/jobs/bookmark", data).then((r) => r.data),
  removeBookmark: (id: number) =>
    api.delete(`/jobs/bookmark/${id}`).then((r) => r.data),
  getBookmarks: () => api.get("/jobs/bookmarks").then((r) => r.data),
  getStats: () => api.get("/jobs/stats").then((r) => r.data),
};
