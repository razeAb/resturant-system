// SideMenu.jsx
import React from "react";
import PropTypes from "prop-types";
import { NavLink, Link } from "react-router-dom";
import {
  Home,
  ListChecks,
  ClipboardList,
  ChefHat,
  History,
  LayoutGrid,
  Store,
  ArrowRight,
  BarChart3,
  Users,
  UtensilsCrossed,
  MapPinned,
} from "lucide-react";
const navItems = [
  { to: "/admin/dashboard", label: "לוח בקרה", icon: Home },
  { to: "/admin/products", label: "מוצרים", icon: LayoutGrid },
  { to: "/admin/activeOrders", label: "הזמנות פעילות", icon: ListChecks },
  { to: "/kitchen", label: "מסך מטבח", icon: ChefHat },
  { to: "/admin/orderHistory", label: "היסטוריית הזמנות", icon: History },
  { to: "/admin/menu-options", label: "תוספות וסלטים", icon: UtensilsCrossed },
  { to: "/admin/floor", label: "מפת שולחנות", icon: MapPinned },
  { to: "/admin/collections", label: "collections", icon: ClipboardList },
  { to: "/admin/revenue", label: "הכנסות", icon: BarChart3 },
  { to: "/admin/workers", label: "עובדים", icon: Users },
];

export default function SideMenu({ onClose, logoSrc, brand = "Hungry" }) {
  return (
    <aside
      dir="rtl"
      className="
        fixed md:static inset-y-0 right-0 z-40
        w-72 md:w-72
        bg-[#17181d] text-white
        border-l md:border-none border-white/5
        shadow-xl md:shadow-none
        overflow-y-auto
        px-4 md:px-6
      "
    >
      {/* Close (mobile) */}
      {onClose && (
        <div className="flex justify-start md:hidden py-3">
          <button onClick={onClose} className="text-white/70 hover:text-white transition" aria-label="סגור תפריט">
            ✕
          </button>
        </div>
      )}

      {/* Brand / Logo */}
      <div className="flex items-center gap-3 pt-3 pb-6">
        {logoSrc ? (
          <img src={logoSrc} alt={`${brand} logo`} className="h-9 w-9 rounded-xl ring-1 ring-white/10 object-contain bg-white/5" />
        ) : (
          <div className="h-9 w-9 rounded-xl ring-1 ring-white/10 bg-white/5 grid place-items-center">
            <span className="text-lg font-bold">H</span>
          </div>
        )}
        <div className="leading-tight">
          <div className="text-2xl font-extrabold tracking-tight">
            {brand}
            <span className="text-emerald-400">.</span>
          </div>
          <div className="text-xs text-white/50">Modern Admin Dashboard</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium",
                "transition-colors",
                isActive
                  ? "bg-emerald-900/20 text-emerald-300 ring-1 ring-emerald-500/20"
                  : "text-white/70 hover:text-white hover:bg-white/5",
              ].join(" ")
            }
          >
            <span className="shrink-0 grid place-items-center">
              <Icon size={18} />
            </span>
            <span className="truncate">{label}</span>
          </NavLink>
        ))}

        {/* External link (קופה) */}
        <a
          href="https://hungry1.gotpose.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="
            flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            text-white/70 hover:text-white hover:bg-white/5 transition-colors
          "
        >
          <span className="shrink-0 grid place-items-center">
            <Store size={18} />
          </span>
          <span className="truncate">קופה</span>
        </a>

        {/* Home link */}
        <Link
          to="/"
          className="
            flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
            text-white/70 hover:text-white hover:bg-white/5 transition-colors
          "
        >
          <span className="shrink-0 grid place-items-center">
            <ArrowRight size={18} />
          </span>
          <span className="truncate">חזרה לדף הבית</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="py-8 text-center text-[11px] text-white/40">
        <div className="font-medium">{brand} Admin Dashboard</div>
        <div>© {new Date().getFullYear()} All Rights Reserved</div>
        <div className="mt-2">Made by raze</div>
      </div>
    </aside>
  );
}

SideMenu.propTypes = {
  onClose: PropTypes.func,
  logoSrc: PropTypes.string,
  brand: PropTypes.string,
};
