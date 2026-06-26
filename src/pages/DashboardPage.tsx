import { BarChart3, Box, Sparkles, Star } from "lucide-react";

export function DashboardPage({ summary }: { summary: { categories: number; products: number; featured: number; hotSelling: number } }) {
  return (
    <div className="container">
      <section className="card padding-xl">
        <p className="section-subtitle">Overview</p>
        <h2 className="section-title">Dashboard</h2>
        <div className="dashboard-grid">
          <div className="stat-card">
            <div className="stat-icon bg-yellow-100 text-yellow-700">
              <Box />
            </div>
            <div>
              <p className="stat-label">Categories</p>
              <p className="stat-value">{summary.categories}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-slate-100 text-slate-800">
              <BarChart3 />
            </div>
            <div>
              <p className="stat-label">Designs</p>
              <p className="stat-value">{summary.products}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-amber-100 text-amber-800">
              <Sparkles />
            </div>
            <div>
              <p className="stat-label">Featured</p>
              <p className="stat-value">{summary.featured}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon bg-pink-100 text-pink-800">
              <Star />
            </div>
            <div>
              <p className="stat-label">Hot Selling</p>
              <p className="stat-value">{summary.hotSelling}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
