import { NavLink } from "react-router-dom";
import { Search, Briefcase, Bookmark, LayoutDashboard, User } from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/scrape", icon: Search, label: "Search" },
  { to: "/applications", icon: Briefcase, label: "Applied" },
  { to: "/bookmarks", icon: Bookmark, label: "Saved" },
  { to: "/profile", icon: User, label: "Profile" },
];

export default function MobileNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/5 z-50 px-2 py-1">
      <div className="flex justify-around">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                isActive ? "text-brand-400" : "text-surface-200/40"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-1.5 rounded-lg transition-all ${isActive ? "bg-brand-600/20" : ""}`}>
                  <Icon size={20} />
                </div>
                <span className="text-xs font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
