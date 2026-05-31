import { useState, useRef, useEffect } from "react";
import {
  User, Camera, Trash2, Upload, Save, Mail, Phone,
  MapPin, FileText, CheckCircle2, Zap, Edit3
} from "lucide-react";
import { profileApi } from "../api/client";
import { useAuthStore } from "../stores/authStore";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    phone: user?.phone || "",
    location: user?.location || "",
    bio: user?.bio || "",
  });
  const [profile, setProfile] = useState<any>(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const resumeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    profileApi.get().then((p) => {
      setProfile(p);
      setForm({
        full_name: p.full_name,
        phone: p.phone || "",
        location: p.location || "",
        bio: p.bio || "",
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await profileApi.update(form);
      updateUser(result.user);
      setProfile({ ...profile, ...result.user });
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await profileApi.uploadAvatar(file);
      // Reload profile to get actual avatar
      const p = await profileApi.get();
      setProfile(p);
      // Update store with truncated URL (for display we re-fetch)
      const imgUrl = URL.createObjectURL(file);
      updateUser({ avatar_url: imgUrl });
      toast.success("Avatar updated!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setAvatarLoading(false);
      if (avatarRef.current) avatarRef.current.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm("Delete your profile photo?")) return;
    try {
      await profileApi.deleteAvatar();
      setProfile({ ...profile, avatar_url: null });
      updateUser({ avatar_url: undefined });
      toast.success("Avatar deleted");
    } catch {
      toast.error("Failed to delete avatar");
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResumeLoading(true);
    try {
      await profileApi.uploadResume(file);
      setProfile({ ...profile, has_resume: true });
      updateUser({ has_resume: true } as any);
      toast.success("Resume uploaded! AI matching enabled 🚀");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setResumeLoading(false);
      if (resumeRef.current) resumeRef.current.value = "";
    }
  };

  const handleDeleteResume = async () => {
    if (!confirm("Delete your resume?")) return;
    try {
      await profileApi.deleteResume();
      setProfile({ ...profile, has_resume: false });
      updateUser({ has_resume: false } as any);
      toast.success("Resume deleted");
    } catch {
      toast.error("Failed to delete resume");
    }
  };

  const initials = form.full_name
    ?.split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "HK";

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-surface-50">Profile</h1>
        <p className="text-surface-200/50 mt-1">Manage your account information</p>
      </div>

      {/* Avatar section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-50 mb-5">Profile Photo</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-brand-600 to-accent-600 flex items-center justify-center text-2xl font-bold text-white">
              {profile?.avatar_url && !profile.avatar_url.includes("...") ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : user?.avatar_url && !user.avatar_url.includes("...") ? (
                <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initials
              )}
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarLoading}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Camera size={15} /> Upload Photo
            </button>
            {(profile?.avatar_url || user?.avatar_url) && (
              <button
                onClick={handleDeleteAvatar}
                className="flex items-center gap-2 text-sm text-red-400/70 hover:text-red-400 transition-colors px-4 py-2"
              >
                <Trash2 size={15} /> Remove Photo
              </button>
            )}
            <p className="text-xs text-surface-200/30">JPG, PNG or WebP. Max 5MB.</p>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
        </div>
      </div>

      {/* Personal info */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-surface-50">Personal Information</h2>
          {!editing ? (
            <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Edit3 size={15} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {[
            { key: "full_name", label: "Full Name", icon: User, type: "text", placeholder: "Your full name" },
            { key: "phone", label: "Phone", icon: Phone, type: "tel", placeholder: "+91 9876543210" },
            { key: "location", label: "Location", icon: MapPin, type: "text", placeholder: "City, State" },
          ].map(({ key, label, icon: Icon, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-surface-200/60 mb-1.5 flex items-center gap-1.5">
                <Icon size={13} /> {label}
              </label>
              {editing ? (
                <input
                  type={type}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className="input-field"
                  placeholder={placeholder}
                />
              ) : (
                <p className="text-surface-50 py-2 px-1">
                  {(profile as any)?.[key] || <span className="text-surface-200/30 italic">Not set</span>}
                </p>
              )}
            </div>
          ))}

          <div>
            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">Email address</label>
            <div className="flex items-center gap-2 py-2 px-1">
              <Mail size={13} className="text-surface-200/40" />
              <p className="text-surface-50">{profile?.email}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200/60 mb-1.5">Bio</label>
            {editing ? (
              <textarea
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                className="input-field resize-none"
                rows={3}
                placeholder="Tell us about yourself..."
              />
            ) : (
              <p className="text-surface-50 py-2 px-1 whitespace-pre-wrap">
                {profile?.bio || <span className="text-surface-200/30 italic">No bio added</span>}
              </p>
            )}
          </div>
        </div>

        <p className="text-xs text-surface-200/30 mt-4">
          Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" }) : "—"}
        </p>
      </div>

      {/* Resume section */}
      <div className="card">
        <h2 className="text-lg font-semibold text-surface-50 mb-2">Resume</h2>
        <p className="text-sm text-surface-200/40 mb-5">
          Upload your resume to enable AI-powered job matching with Gemini
        </p>

        {profile?.has_resume ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-green-900/20 border border-green-500/20 flex-1">
              <CheckCircle2 size={18} className="text-green-400" />
              <div>
                <p className="text-sm font-semibold text-green-400">Resume uploaded</p>
                <p className="text-xs text-surface-200/40 flex items-center gap-1 mt-0.5">
                  <Zap size={10} className="text-brand-400" /> AI job matching is active
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => resumeRef.current?.click()} disabled={resumeLoading} className="btn-secondary flex items-center gap-2 text-sm">
                <Upload size={14} /> Replace
              </button>
              <button onClick={handleDeleteResume} className="p-2.5 rounded-xl border border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-900/10 transition-all">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => resumeRef.current?.click()}
            className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500/30 hover:bg-brand-900/10 transition-all duration-200"
          >
            {resumeLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
                <p className="text-sm text-surface-200/50">Uploading...</p>
              </div>
            ) : (
              <>
                <FileText size={32} className="text-surface-200/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-surface-50 mb-1">Upload your resume</p>
                <p className="text-xs text-surface-200/30">TXT or PDF, max 2MB</p>
              </>
            )}
          </div>
        )}
        <input ref={resumeRef} type="file" accept=".txt,.pdf" onChange={handleResumeUpload} className="hidden" />
      </div>
    </div>
  );
}
