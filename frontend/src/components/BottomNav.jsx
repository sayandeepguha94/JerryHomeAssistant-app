import React from "react";
import { NavLink } from "react-router-dom";
import { Home, ShoppingBasket, Settings, Users as UsersIcon } from "lucide-react";
import { useAuth, hasPage } from "../lib/auth";

const ITEMS = [
  { to: "/", page: "dashboard", label: "Home", Icon: Home, tid: "nav-home", always: false },
  { to: "/shopping", page: "shopping", label: "List", Icon: ShoppingBasket, tid: "nav-shopping", always: false },
  { to: "/users", page: "users", label: "Users", Icon: UsersIcon, tid: "nav-users", adminOnly: true },
  { to: "/settings", page: "settings", label: "Setup", Icon: Settings, tid: "nav-settings", always: true },
];

export default function BottomNav() {
  const { user } = useAuth();
  const visible = ITEMS.filter((it) => {
    if (it.always) return true;
    if (it.adminOnly) return user?.role === "admin";
    return hasPage(user, it.page);
  });
  return (
    <div className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 pointer-events-none" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="glass rounded-full px-3 py-2 flex items-center gap-1 pointer-events-auto shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
        {visible.map(({ to, label, Icon, tid }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            data-testid={tid}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center px-3 py-2 rounded-full min-w-[62px] transition-colors ${
                isActive ? "bg-[#E05D26] text-white" : "text-white/50 hover:text-white"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
