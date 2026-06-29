import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Home, List, PackageCheck, Settings, Sparkles, Star } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { adminApi, getErrorMessage, tokenStorage } from "@/lib/api";
import { emptySiteSettings, type AdminUser, type Category, type FeaturedItem, type HotSellingItem, type Order, type OrderStatus, type Product, type SiteSettings } from "@/lib/types";
import { DashboardPage } from "@/pages/DashboardPage";
import { CategoriesPage } from "@/pages/CategoriesPage";
import { FeaturedPage } from "@/pages/FeaturedPage";
import { HotSellingPage } from "@/pages/HotSellingPage";
import { LoginPage } from "@/pages/LoginPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { SettingsPage } from "@/pages/SettingsPage";

const navItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/categories", label: "Categories", icon: List },
  { path: "/orders", label: "Orders", icon: PackageCheck },
  { path: "/featured", label: "Featured Pieces", icon: Sparkles },
  { path: "/hot-selling", label: "Hot Selling", icon: Star },
  { path: "/settings", label: "Settings", icon: Settings },
];

async function loadAdminData(token: string) {
  const [categoriesResponse, productsResponse, ordersResponse, featuredResponse, hotSellingResponse, settingsResponse] = await Promise.all([
    adminApi.getCategories(token),
    adminApi.getProducts(token),
    adminApi.getOrders(token),
    adminApi.getFeatured(token),
    adminApi.getHotSelling(token),
    adminApi.getSettings(token),
  ]);

  return {
    categories: categoriesResponse.items,
    products: productsResponse.items,
    orders: ordersResponse.items,
    featured: featuredResponse.items,
    hotSelling: hotSellingResponse.items,
    settings: settingsResponse,
  };
}

function attachProductsToCategories(categories: Category[], products: Product[]) {
  const productsByCategory = new Map<string, Product[]>();

  for (const product of products) {
    const existingProducts = productsByCategory.get(product.categorySlug) ?? [];
    existingProducts.push(product);
    productsByCategory.set(product.categorySlug, existingProducts);
  }

  return categories.map((category) => ({
    ...category,
    products: productsByCategory.get(category.slug) ?? [],
  }));
}

function App() {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [user, setUser] = useState<AdminUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [hotSelling, setHotSelling] = useState<HotSellingItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(emptySiteSettings);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(token));
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const categoriesWithProducts = useMemo(
    () => attachProductsToCategories(categories, products),
    [categories, products],
  );

  useEffect(() => {
    let cancelled = false;

    if (!token) {
      setIsAuthLoading(false);
      setIsDataLoading(false);
      setUser(null);
      return () => {
        cancelled = true;
      };
    }

    setIsAuthLoading(true);
    setIsDataLoading(true);

    void (async () => {
      try {
        const [{ user: currentUser }, data] = await Promise.all([adminApi.me(token), loadAdminData(token)]);
        if (cancelled) {
          return;
        }

        setUser(currentUser);
        setCategories(data.categories);
        setProducts(data.products);
        setOrders(data.orders);
        setFeatured(data.featured);
        setHotSelling(data.hotSelling);
        setSettings(data.settings);
        setGlobalError(null);
      } catch (error) {
        if (cancelled) {
          return;
        }

        tokenStorage.clear();
        setToken(null);
        setUser(null);
        setGlobalError(getErrorMessage(error));
      } finally {
        if (!cancelled) {
          setIsAuthLoading(false);
          setIsDataLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const summary = useMemo(
    () => ({
      categories: categories.length,
      products: products.length,
      orders: orders.length,
      featured: featured.length,
      hotSelling: hotSelling.length,
    }),
    [categories.length, products.length, orders.length, featured.length, hotSelling.length],
  );

  const isAuthenticated = Boolean(token && user);

  const requireToken = () => {
    if (!token) {
      throw new Error("You are signed out. Please log in again.");
    }

    return token;
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      const { token: authToken, user: loggedInUser } = await adminApi.login(email, password);
      setIsDataLoading(true);
      tokenStorage.set(authToken);
      setToken(authToken);
      setUser(loggedInUser);
      setGlobalError(null);
      return null;
    } catch (error) {
      return getErrorMessage(error);
    }
  };

  const handleLogout = () => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setCategories([]);
    setProducts([]);
    setOrders([]);
    setFeatured([]);
    setHotSelling([]);
    setSettings(emptySiteSettings);
    setGlobalError(null);
  };

  const handleSaveCategory = async (payload: Category, currentSlug?: string) => {
    const authToken = requireToken();
    const savedCategory = currentSlug
      ? await adminApi.updateCategory(authToken, currentSlug, payload)
      : await adminApi.createCategory(authToken, payload);
    const refreshedData = await loadAdminData(authToken);
    const nextCategories = attachProductsToCategories(refreshedData.categories, refreshedData.products);

    setCategories(refreshedData.categories);
    setProducts(refreshedData.products);
    setOrders(refreshedData.orders);
    setFeatured(refreshedData.featured);
    setHotSelling(refreshedData.hotSelling);
    setSettings(refreshedData.settings);

    return nextCategories.find((item) => item.slug === savedCategory.slug) ?? savedCategory;
  };

  const handleDeleteCategory = async (slug: string) => {
    const authToken = requireToken();
    await adminApi.deleteCategory(authToken, slug);
    const refreshedData = await loadAdminData(authToken);
    setCategories(refreshedData.categories);
    setProducts(refreshedData.products);
    setOrders(refreshedData.orders);
    setFeatured(refreshedData.featured);
    setHotSelling(refreshedData.hotSelling);
    setSettings(refreshedData.settings);
  };

  const handleCreateFeatured = async (payload: FeaturedItem) => {
    const authToken = requireToken();
    const savedItem = await adminApi.createFeatured(authToken, payload);
    setFeatured((current) => [savedItem, ...current]);
  };

  const handleDeleteFeatured = async (id: string) => {
    const authToken = requireToken();
    await adminApi.deleteFeatured(authToken, id);
    setFeatured((current) => current.filter((item) => item.id !== id));
  };

  const handleCreateHotSelling = async (payload: HotSellingItem) => {
    const authToken = requireToken();
    const savedItem = await adminApi.createHotSelling(authToken, payload);
    setHotSelling((current) => [savedItem, ...current]);
  };

  const handleDeleteHotSelling = async (id: string) => {
    const authToken = requireToken();
    await adminApi.deleteHotSelling(authToken, id);
    setHotSelling((current) => current.filter((item) => item.id !== id));
  };

  const handleSaveSettings = async (payload: SiteSettings) => {
    const authToken = requireToken();
    const savedSettings = await adminApi.updateSettings(authToken, payload);
    setSettings(savedSettings);
  };

  const handleUpdateOrderStatus = async (id: string, status: OrderStatus) => {
    const authToken = requireToken();
    const updatedOrder = await adminApi.updateOrderStatus(authToken, id, status);
    setOrders((current) => current.map((order) => (order.id === id ? updatedOrder : order)));
  };

  const handleDeleteOrder = async (id: string) => {
    const authToken = requireToken();
    await adminApi.deleteOrder(authToken, id);
    setOrders((current) => current.filter((order) => order.id !== id));
  };

  const handleDownloadOrderPdf = async (id: string) => {
    const authToken = requireToken();
    const blob = await adminApi.downloadOrderPdf(authToken, id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `order-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (isAuthLoading) {
    return (
      <div className="login-page">
        <div className="login-card card padding-xl">
          <h1 className="section-title">Checking session</h1>
          <p className="section-subtitle">Connecting to the backend and loading your admin data.</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage onLogin={handleLogin} isAuthenticated={isAuthenticated} />} />
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <AdminLayout navItems={navItems} summary={summary} user={user} onLogout={handleLogout}>
              {globalError ? (
                <div className="container">
                  <section className="card padding-lg">
                    <p className="error-text">{globalError}</p>
                  </section>
                </div>
              ) : null}

              {isDataLoading ? (
                <div className="container">
                  <section className="card padding-xl">
                    <p className="section-subtitle">Loading your categories, designs, featured pieces, and settings.</p>
                  </section>
                </div>
              ) : (
                <Routes>
                  <Route path="/" element={<DashboardPage summary={summary} />} />
                  <Route path="/categories" element={<CategoriesPage categories={categoriesWithProducts} onSave={handleSaveCategory} onDelete={handleDeleteCategory} />} />
                  <Route path="/orders" element={<OrdersPage orders={orders} onStatusChange={handleUpdateOrderStatus} onDelete={handleDeleteOrder} onDownloadPdf={handleDownloadOrderPdf} />} />
                  <Route path="/products" element={<Navigate to="/categories" replace />} />
                  <Route path="/featured" element={<FeaturedPage featured={featured} onCreate={handleCreateFeatured} onDelete={handleDeleteFeatured} />} />
                  <Route path="/hot-selling" element={<HotSellingPage hotSelling={hotSelling} categories={categories} onCreate={handleCreateHotSelling} onDelete={handleDeleteHotSelling} />} />
                  <Route path="/settings" element={<SettingsPage settings={settings} onSave={handleSaveSettings} />} />
                </Routes>
              )}
            </AdminLayout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

export default function AppWrapper() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
