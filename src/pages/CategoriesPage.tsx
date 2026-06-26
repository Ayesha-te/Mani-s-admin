import { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/image-utils";
import { getErrorMessage } from "@/lib/api";
import type { Category, CategoryDesign } from "@/lib/types";

function createEmptyDesign(): CategoryDesign {
  return {
    title: "",
    image: "",
    price: 0,
    description: "",
    featured: false,
    hotSelling: false,
    position: 0,
  };
}

function createEmptyForm() {
  return {
    name: "",
    description: "",
    image: "",
    products: [] as CategoryDesign[],
  };
}

function createLegacyDesigns(category: Category) {
  if (category.products && category.products.length > 0) {
    return category.products.map((product, index) => ({
      ...product,
      position: product.position ?? index,
    }));
  }

  return (category.galleryImages ?? []).map((image, index) => ({
    ...createEmptyDesign(),
    title: `${category.name} Design ${index + 1}`,
    image,
    position: index,
  }));
}

export function CategoriesPage({
  categories,
  onSave,
  onDelete,
}: {
  categories: Category[];
  onSave: (payload: Category, currentSlug?: string) => Promise<Category>;
  onDelete: (slug: string) => Promise<void>;
}) {
  const [form, setForm] = useState(createEmptyForm);
  const [editSlug, setEditSlug] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const cleanedProducts = form.products.map((product, index) => ({
        ...product,
        title: product.title.trim(),
        image: product.image?.trim() || "",
        description: product.description?.trim() || "",
        position: index,
      }));

      await onSave(
        {
          name: form.name,
          slug: "",
          description: form.description,
          designs: cleanedProducts.length,
          image: form.image || cleanedProducts[0]?.image || "",
          galleryImages: cleanedProducts.map((product) => product.image).filter(Boolean),
          products: cleanedProducts,
        },
        editSlug ?? undefined,
      );

      setForm(createEmptyForm());
      setEditSlug(null);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (slug: string) => {
    const category = categories.find((item) => item.slug === slug);
    if (!category) {
      return;
    }

    setForm({
      name: category.name,
      description: category.description,
      image: category.image || "",
      products: createLegacyDesigns(category),
    });
    setEditSlug(slug);
    setError(null);
  };

  const handleDelete = async (slug: string) => {
    if (!window.confirm("Delete this category and all designs inside it?")) {
      return;
    }

    setError(null);
    setDeletingSlug(slug);

    try {
      await onDelete(slug);
      if (editSlug === slug) {
        setForm(createEmptyForm());
        setEditSlug(null);
      }
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingSlug(null);
    }
  };

  const handleCoverImageChange = async (file: File | null) => {
    if (!file) {
      return;
    }

    setIsUploadingImages(true);

    try {
      const image = await fileToDataUrl(file);
      setForm((current) => ({
        ...current,
        image,
      }));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleAddDesignImages = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setIsUploadingImages(true);

    try {
      const newDesigns = await Promise.all(
        Array.from(files).map(async (file) => ({
          ...createEmptyDesign(),
          image: await fileToDataUrl(file),
        })),
      );

      setForm((current) => ({
        ...current,
        products: [...current.products, ...newDesigns],
      }));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleReplaceDesignImage = async (index: number, file: File | null) => {
    if (!file) {
      return;
    }

    setError(null);
    setIsUploadingImages(true);

    try {
      const image = await fileToDataUrl(file);
      setForm((current) => ({
        ...current,
        products: current.products.map((product, productIndex) => (productIndex === index ? { ...product, image } : product)),
      }));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleDesignChange = <K extends keyof CategoryDesign>(index: number, key: K, value: CategoryDesign[K]) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => (productIndex === index ? { ...product, [key]: value } : product)),
    }));
  };

  const handleAddEmptyDesign = () => {
    setForm((current) => ({
      ...current,
      products: [...current.products, createEmptyDesign()],
    }));
  };

  const handleRemoveDesign = (indexToRemove: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.filter((_, index) => index !== indexToRemove),
    }));
  };

  return (
    <div className="container">
      <section className="card padding-xl">
        <div className="section-row">
          <div>
            <p className="section-subtitle">Manage categories</p>
            <h2 className="section-title">Categories</h2>
          </div>
        </div>

        <div className="form-grid">
          <form className="card padding-lg" onSubmit={handleSubmit}>
            <p className="section-subtitle">Add or edit a category</p>

            <div className="form-row">
              <label>
                Name
                <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
              </label>

              <label>
                Description
                <textarea className="textarea" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} required />
              </label>

              <label>
                Cover image
                <input className="input" type="file" accept="image/*" onChange={(event) => void handleCoverImageChange(event.target.files?.[0] ?? null)} />
                <small className="section-subtitle">The slug is now created automatically from the category name.</small>
              </label>

              <label>
                Add design images
                <input className="input" type="file" accept="image/*" multiple onChange={(event) => void handleAddDesignImages(event.target.files)} />
                <small className="section-subtitle">Upload one or more design photos, then fill in each design's name, price, and badges below.</small>
              </label>
            </div>

            {form.image ? (
              <div style={{ marginTop: "1rem" }}>
                <p className="section-subtitle">Cover preview</p>
                <img src={form.image} alt="Category cover preview" style={{ width: "100%", maxWidth: "240px", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: "16px" }} />
              </div>
            ) : null}

            <div className="section-row" style={{ marginTop: "1.5rem" }}>
              <div>
                <p className="section-subtitle">Design items</p>
                <p className="section-subtitle">{form.products.length} design{form.products.length === 1 ? "" : "s"} in this category</p>
              </div>
              <button className="button secondary" type="button" onClick={handleAddEmptyDesign}>
                <Plus />
                Add design
              </button>
            </div>

            {form.products.length > 0 ? (
              <div style={{ display: "grid", gap: "1rem" }}>
                {form.products.map((product, index) => (
                  <div key={product.id ?? `design-${index}`} className="card padding-lg">
                    <div className="section-row" style={{ alignItems: "flex-start" }}>
                      <div>
                        <p className="section-subtitle">Design {index + 1}</p>
                        <p className="section-subtitle">This will appear on the website inside the category page.</p>
                      </div>
                      <button className="button secondary" type="button" onClick={() => handleRemoveDesign(index)}>
                        <Trash2 />
                      </button>
                    </div>

                    <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "minmax(0, 180px) minmax(0, 1fr)" }}>
                      <div>
                        <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "16px", overflow: "hidden", background: "rgba(15, 23, 42, 0.08)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                          {product.image ? (
                            <img src={product.image} alt={product.title || `Design ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#64748b" }}>
                              <ImagePlus />
                            </div>
                          )}
                        </div>

                        <label style={{ display: "block", marginTop: "0.75rem" }}>
                          Replace image
                          <input className="input" type="file" accept="image/*" onChange={(event) => void handleReplaceDesignImage(index, event.target.files?.[0] ?? null)} />
                        </label>
                      </div>

                      <div className="form-row">
                        <label>
                          Design name
                          <input className="input" value={product.title} onChange={(event) => handleDesignChange(index, "title", event.target.value)} required />
                        </label>

                        <label>
                          Price
                          <input className="input" type="number" min={1} value={product.price} onChange={(event) => handleDesignChange(index, "price", Number(event.target.value))} required />
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input type="checkbox" checked={product.featured} onChange={(event) => handleDesignChange(index, "featured", event.target.checked)} />
                          Mark as featured
                        </label>

                        <label style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <input type="checkbox" checked={product.hotSelling} onChange={(event) => handleDesignChange(index, "hotSelling", event.target.checked)} />
                          Mark as hot selling
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card padding-lg" style={{ marginTop: "1rem" }}>
                <p className="section-subtitle">No designs added yet. Upload photos above or click "Add design" to start.</p>
              </div>
            )}

            {error ? <p className="error-text">{error}</p> : null}

            <div className="section-row" style={{ marginTop: "1.5rem" }}>
              <button type="submit" className="button" disabled={isSubmitting || isUploadingImages}>
                <Plus />
                {isSubmitting ? "Saving..." : isUploadingImages ? "Preparing images..." : editSlug ? "Save category" : "Add category"}
              </button>
            </div>
          </form>

          <div className="card padding-lg">
            <p className="section-subtitle">Category list</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Designs</th>
                  <th>Featured</th>
                  <th>Hot Selling</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.slug}>
                    <td>{category.name}</td>
                    <td>{category.slug}</td>
                    <td>{category.products?.length ?? category.designs}</td>
                    <td>{category.products?.filter((product) => product.featured).length ?? 0}</td>
                    <td>{category.products?.filter((product) => product.hotSelling).length ?? 0}</td>
                    <td>
                      <button className="button secondary" type="button" onClick={() => handleEdit(category.slug)}>
                        Edit
                      </button>
                      <button className="button secondary" type="button" onClick={() => handleDelete(category.slug)} disabled={deletingSlug === category.slug}>
                        <Trash2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
