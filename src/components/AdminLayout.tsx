import { Link, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { type LucideIcon, LogOut } from "lucide-react";
import type { AdminUser } from "@/lib/types";

export function AdminLayout({
  children,
  navItems,
  summary,
  user,
  onLogout,
}: {
  children: ReactNode;
  navItems: Array<{ path: string; label: string; icon: LucideIcon }>;
  summary: { categories: number; products: number; orders: number; featured: number; hotSelling: number };
  user: AdminUser | null;
  onLogout: () => void;
}) {
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="logo">MJ</div>
          <div>
            <p className="brand-title">Mani Admin</p>
            <p className="brand-subtitle">Manage the storefront</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={active ? "nav-item active" : "nav-item"}>
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <p className="summary-label">Signed in</p>
          <p className="summary-value">{user?.name ?? "Admin"}</p>
          <p className="summary-text">{user?.email ?? ""}</p>
          <p className="summary-label" style={{ marginTop: "1.5rem" }}>
            Summary
          </p>
          <div className="summary-grid">
            <div>
              <p className="summary-value">{summary.categories}</p>
              <p className="summary-text">Categories</p>
            </div>
            <div>
              <p className="summary-value">{summary.products}</p>
              <p className="summary-text">Designs</p>
            </div>
            <div>
              <p className="summary-value">{summary.orders}</p>
              <p className="summary-text">Orders</p>
            </div>
            <div>
              <p className="summary-value">{summary.featured}</p>
              <p className="summary-text">Featured</p>
            </div>
            <div>
              <p className="summary-value">{summary.hotSelling}</p>
              <p className="summary-text">Hot Sell</p>
            </div>
          </div>
          <button className="button logout-button" onClick={onLogout} type="button">
            <LogOut className="nav-icon" />
            Logout
          </button>
        </div>
      </aside>

      <main className="content">
        <div className="content-header">
          <div>
            <p className="section-label">Admin panel</p>
            <h1 className="section-title">Storefront management</h1>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
