import { useEffect, useMemo, useRef, useState } from "react";
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
  const [categoriesResponse, ordersResponse, featuredResponse, hotSellingResponse, settingsResponse] = await Promise.all([
    adminApi.getCategories(token),
    adminApi.getOrders(token),
    adminApi.getFeatured(token),
    adminApi.getHotSelling(token),
    adminApi.getSettings(token),
  ]);

  return {
    categories: categoriesResponse.items,
    orders: ordersResponse.items,
    featured: featuredResponse.items,
    hotSelling: hotSellingResponse.items,
    settings: settingsResponse,
  };
}

async function refreshCatalogData(token: string) {
  const [categoriesResponse, featuredResponse, hotSellingResponse] = await Promise.all([
    adminApi.getCategories(token),
    adminApi.getFeatured(token),
    adminApi.getHotSelling(token),
  ]);

  return {
    categories: categoriesResponse.items,
    featured: featuredResponse.items,
    hotSelling: hotSellingResponse.items,
  };
}

function mergeDetailedCategory(categories: Category[], detailedCategory: Category) {
  let found = false;
  const nextCategories = categories.map((category) => {
    if (category.slug !== detailedCategory.slug) {
      return category;
    }

    found = true;
    return {
      ...category,
      ...detailedCategory,
    };
  });

  return found ? nextCategories : [detailedCategory, ...nextCategories];
}

async function runWithConcurrencyLimit<T>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<void>,
) {
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        await task(items[currentIndex], currentIndex);
      }
    }),
  );
}

function normalizeProductPayload(product: Product, categorySlug: string, fallbackDescription: string, position: number): Product {
  const images = (product.images ?? [])
    .map((image) => ({
      url: image.url?.trim() || "",
      color: image.color?.trim() || "",
    }))
    .filter((image) => image.url);
  const image = images[0]?.url || product.image?.trim() || "";
  const colors = Array.from(
    new Set(
      [...(product.colors ?? []), ...images.map((imageItem) => imageItem.color ?? "")]
        .map((color) => color.trim())
        .filter(Boolean),
    ),
  );

  return {
    ...product,
    title: product.title.trim(),
    categorySlug,
    image,
    images,
    colors,
    price: Number(product.price),
    basePrice: Math.max(0, Number(product.basePrice || 0)),
    deliveryCharge: Math.max(0, Number(product.deliveryCharge || 0)),
    description: product.description?.trim() || fallbackDescription,
    featured: Boolean(product.featured),
    hotSelling: Boolean(product.hotSelling),
    position,
  };
}

async function syncCategoryProducts(
  token: string,
  existingProducts: Product[],
  submittedProducts: Product[],
  categorySlug: string,
  fallbackDescription: string,
) {
  const existingProductIds = new Set(existingProducts.map((product) => product.id).filter(Boolean));
  const submittedProductIds = new Set(submittedProducts.map((product) => product.id).filter(Boolean));

  await runWithConcurrencyLimit(submittedProducts, 4, async (product, index) => {
    const normalizedProduct = normalizeProductPayload(product, categorySlug, fallbackDescription, index);

    if (normalizedProduct.id) {
      await adminApi.updateProduct(token, normalizedProduct.id, normalizedProduct);
      return;
    }

    await adminApi.createProduct(token, normalizedProduct);
  });

  const removedProducts = existingProducts.filter((existingProduct) => (
    existingProduct.id
    && existingProductIds.has(existingProduct.id)
    && !submittedProductIds.has(existingProduct.id)
  ));

  await Promise.all(
    removedProducts.map((existingProduct) => adminApi.deleteProduct(token, existingProduct.id as string)),
  );
}

function App() {
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [user, setUser] = useState<AdminUser | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [featured, setFeatured] = useState<FeaturedItem[]>([]);
  const [hotSelling, setHotSelling] = useState<HotSellingItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(emptySiteSettings);
  const [isAuthLoading, setIsAuthLoading] = useState(Boolean(token));
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const categorySavePromiseRef = useRef<Promise<Category> | null>(null);

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
        setCategories([]);
        setOrders([]);
        setFeatured([]);
        setHotSelling([]);
        setSettings(emptySiteSettings);
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
      products: categories.reduce((total, category) => total + Math.max(0, Number(category.designs || 0)), 0),
      orders: orders.length,
      featured: featured.length,
      hotSelling: hotSelling.length,
    }),
    [categories, orders.length, featured.length, hotSelling.length],
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
    setOrders([]);
    setFeatured([]);
    setHotSelling([]);
    setSettings(emptySiteSettings);
    setGlobalError(null);
  };

  const handleLoadCategory = async (slug: string) => {
    const authToken = requireToken();
    const existingCategory = categories.find((item) => item.slug === slug);
    if (!existingCategory) {
      throw new Error("Category not found.");
    }

    if (Object.prototype.hasOwnProperty.call(existingCategory, "products")) {
      return existingCategory;
    }

    const detailedCategory = await adminApi.getCategory(authToken, slug);
    setCategories((current) => mergeDetailedCategory(current, detailedCategory));
    return detailedCategory;
  };

  const handleSaveCategory = async (payload: Category, currentSlug?: string) => {
    if (categorySavePromiseRef.current) {
      return categorySavePromiseRef.current;
    }

    const authToken = requireToken();
    const existingCategory = currentSlug
      ? categories.find((item) => item.slug === currentSlug) ?? null
      : null;
    const submittedProducts = (payload.products ?? []).map((product, index) => normalizeProductPayload({
      ...product,
      categorySlug: currentSlug || payload.slug,
      description: product.description || payload.description,
    }, currentSlug || payload.slug, payload.description, index));
    const categoryPayload: Category = {
      name: payload.name,
      slug: payload.slug,
      description: payload.description,
      designs: submittedProducts.length,
      image: payload.image || submittedProducts[0]?.image || "",
      galleryImages: [],
    };

    const savePromise = (async () => {
      try {
        const savedCategory = currentSlug
          ? await adminApi.updateCategory(authToken, currentSlug, categoryPayload)
          : await adminApi.createCategory(authToken, categoryPayload);

        await syncCategoryProducts(
          authToken,
          existingCategory?.products ?? [],
          submittedProducts,
          savedCategory.slug,
          payload.description,
        );

        const [refreshedCatalog, detailedCategory] = await Promise.all([
          refreshCatalogData(authToken),
          adminApi.getCategory(authToken, savedCategory.slug),
        ]);

        setCategories(mergeDetailedCategory(refreshedCatalog.categories, detailedCategory));
        setFeatured(refreshedCatalog.featured);
        setHotSelling(refreshedCatalog.hotSelling);

        return detailedCategory;
      } catch (error) {
        try {
          const refreshedCatalog = await refreshCatalogData(authToken);
          setCategories(refreshedCatalog.categories);
          setFeatured(refreshedCatalog.featured);
          setHotSelling(refreshedCatalog.hotSelling);
        } catch {
          // Ignore refresh errors and surface the original failure.
        }

        throw error;
      } finally {
        if (categorySavePromiseRef.current === savePromise) {
          categorySavePromiseRef.current = null;
        }
      }
    })();

    categorySavePromiseRef.current = savePromise;
    return savePromise;
  };

  const handleDeleteCategory = async (slug: string) => {
    const authToken = requireToken();
    await adminApi.deleteCategory(authToken, slug);
    const refreshedCatalog = await refreshCatalogData(authToken);
    setCategories(refreshedCatalog.categories);
    setFeatured(refreshedCatalog.featured);
    setHotSelling(refreshedCatalog.hotSelling);
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
                  <Route path="/categories" element={<CategoriesPage categories={categories} onEdit={handleLoadCategory} onSave={handleSaveCategory} onDelete={handleDeleteCategory} />} />
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
