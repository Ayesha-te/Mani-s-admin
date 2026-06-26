export type CategoryDesign = {
  id?: string;
  title: string;
  image?: string;
  price: number;
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
};
