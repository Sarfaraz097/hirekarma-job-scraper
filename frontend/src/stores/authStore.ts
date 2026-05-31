import { create } from "zustand";
import { authApi } from "../api/client";

interface User {
  id: number;
  full_name: string;
  email: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
  has_resume?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (full_name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,

  loadFromStorage: () => {
    const token = localStorage.getItem("hk_token");
    const userStr = localStorage.getItem("hk_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      } catch {
        localStorage.removeItem("hk_token");
        localStorage.removeItem("hk_user");
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.login({ email, password });
      localStorage.setItem("hk_token", data.access_token);
      localStorage.setItem("hk_user", JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (full_name, email, password) => {
    set({ isLoading: true });
    try {
      const data = await authApi.signup({ full_name, email, password });
      localStorage.setItem("hk_token", data.access_token);
      localStorage.setItem("hk_user", JSON.stringify(data.user));
      set({ token: data.access_token, user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem("hk_token");
    localStorage.removeItem("hk_user");
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    localStorage.setItem("hk_user", JSON.stringify(updated));
    set({ user: updated });
  },
}));
