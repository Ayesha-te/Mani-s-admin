import type { AdminUser, Category, FeaturedItem, HotSellingItem, Order, OrderStatus, Product, SiteSettings } from "@/lib/types";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_API_BASE_URL = "https://jewel-backend-five.vercel.app/api";
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, "");
const TOKEN_STORAGE_KEY = "mani-admin-token";

async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as { message?: string }) : {};

  if (!response.ok) {
    throw new ApiError(payload.message || `Request failed with status ${response.status}.`, response.status);
  }

  return payload as T;
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  return parseResponse<T>(response);
}

async function requestBlob(path: string, token: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    await parseResponse(response);
  }

  return response.blob();
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong.";
}

export const tokenStorage = {
  get() {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  },
  set(token: string) {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
  },
};

export const adminApi = {
  login(email: string, password: string) {
    return request<{ token: string; user: AdminUser }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },
  me(token: string) {
    return request<{ user: AdminUser }>("/admin/auth/me", {}, token);
  },
  getCategories(token: string) {
    return request<{ items: Category[] }>("/admin/categories", {}, token);
  },
  createCategory(token: string, payload: Category) {
    return request<Category>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);
  },
  updateCategory(token: string, currentSlug: string, payload: Category) {
    return request<Category>(`/admin/categories/${currentSlug}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, token);
  },
  deleteCategory(token: string, slug: string) {
    return request<void>(`/admin/categories/${slug}`, { method: "DELETE" }, token);
  },
  getProducts(token: string) {
    return request<{ items: Product[] }>("/admin/products", {}, token);
  },
  getOrders(token: string) {
    return request<{ items: Order[] }>("/admin/orders", {}, token);
  },
  updateOrderStatus(token: string, id: string, status: OrderStatus) {
    return request<Order>(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }, token);
  },
  deleteOrder(token: string, id: string) {
    return request<void>(`/admin/orders/${id}`, { method: "DELETE" }, token);
  },
  downloadOrderPdf(token: string, id: string) {
    return requestBlob(`/admin/orders/${id}/pdf`, token);
  },
  createProduct(token: string, payload: Product) {
    return request<Product>("/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);
  },
  deleteProduct(token: string, id: string) {
    return request<void>(`/admin/products/${id}`, { method: "DELETE" }, token);
  },
  getFeatured(token: string) {
    return request<{ items: FeaturedItem[] }>("/admin/featured", {}, token);
  },
  createFeatured(token: string, payload: FeaturedItem) {
    return request<FeaturedItem>("/admin/featured", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);
  },
  deleteFeatured(token: string, id: string) {
    return request<void>(`/admin/featured/${id}`, { method: "DELETE" }, token);
  },
  getHotSelling(token: string) {
    return request<{ items: HotSellingItem[] }>("/admin/hot-selling", {}, token);
  },
  createHotSelling(token: string, payload: HotSellingItem) {
    return request<HotSellingItem>("/admin/hot-selling", {
      method: "POST",
      body: JSON.stringify(payload),
    }, token);
  },
  deleteHotSelling(token: string, id: string) {
    return request<void>(`/admin/hot-selling/${id}`, { method: "DELETE" }, token);
  },
  getSettings(token: string) {
    return request<SiteSettings>("/admin/settings", {}, token);
  },
  updateSettings(token: string, payload: SiteSettings) {
    return request<SiteSettings>("/admin/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    }, token);
  },
};
