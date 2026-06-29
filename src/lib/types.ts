export type DesignImage = {
  url: string;
  color?: string;
};

export type CategoryDesign = {
  id?: string;
  title: string;
  image?: string;
  images?: DesignImage[];
  colors?: string[];
  price: number;
  basePrice?: number;
  deliveryCharge?: number;
  description?: string;
  featured: boolean;
  hotSelling: boolean;
  position?: number;
};

export type Category = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  designs: number;
  image?: string;
  galleryImages?: string[];
  featuredCount?: number;
  hotSellingCount?: number;
  products?: CategoryDesign[];
};

export type Product = CategoryDesign & {
  categorySlug: string;
  description: string;
};

export type FeaturedItem = {
  id?: string;
  title: string;
  image: string;
};

export type HotSellingItem = {
  id?: string;
  title: string;
  image: string;
  slug: string;
};

export type SiteSettings = {
  id?: string;
  whatsappNumber: string;
  whatsappLink: string;
  instagram: string;
  instagramLink: string;
  facebookLink: string;
  tiktokLink: string;
  email: string;
  address: string;
  storeHours: string;
  defaultDeliveryCharge: number;
};

export type OrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";

export type Order = {
  id: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    notes?: string;
  };
  items: Array<{
    productId?: string;
    productName: string;
    color?: string;
    quantity: number;
    unitPrice: number;
    basePrice?: number;
    deliveryCharge: number;
    image?: string;
  }>;
  paymentMethod: "COD";
  status: OrderStatus;
  subtotal: number;
  deliveryTotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export const emptySiteSettings: SiteSettings = {
  whatsappNumber: "",
  whatsappLink: "",
  instagram: "",
  instagramLink: "",
  facebookLink: "",
  tiktokLink: "",
  email: "",
  address: "",
  storeHours: "",
  defaultDeliveryCharge: 0,
};
