import { useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { fileToDataUrl } from "@/lib/image-utils";
import { getErrorMessage } from "@/lib/api";
import type { Category, CategoryDesign } from "@/lib/types";

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeDesign(product: CategoryDesign): CategoryDesign {
  const images = (product.images && product.images.length > 0
    ? product.images
    : product.image
      ? [{ url: product.image, color: "" }]
      : [])
    .map((image) => ({
      url: image.url?.trim() || "",
      color: image.color?.trim() || "",
    }))
    .filter((image) => image.url);

  const colors = dedupeStrings([...(product.colors ?? []), ...images.map((image) => image.color ?? "")]);

  return {
    ...createEmptyDesign(),
    ...product,
    image: product.image || images[0]?.url || "",
    images,
    colors,
  };
}

function createEmptyDesign(): CategoryDesign {
  return {
    title: "",
    image: "",
    images: [],
    colors: [],
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
    return category.products.map((product, index) => normalizeDesign({
      ...product,
      position: product.position ?? index,
    }));
  }

  return (category.galleryImages ?? []).map((image, index) => normalizeDesign({
    ...createEmptyDesign(),
    title: `${category.name} Design ${index + 1}`,
    image,
    images: [{ url: image, color: "" }],
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
      const cleanedProducts = form.products.map((product, index) => {
        const normalizedProduct = normalizeDesign(product);

        return {
          ...normalizedProduct,
          title: normalizedProduct.title.trim(),
          image: normalizedProduct.images?.[0]?.url || normalizedProduct.image?.trim() || "",
          images: normalizedProduct.images ?? [],
          colors: dedupeStrings([...(normalizedProduct.colors ?? []), ...(normalizedProduct.images ?? []).map((image) => image.color ?? "")]),
          description: normalizedProduct.description?.trim() || "",
          position: index,
        };
      });

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
        Array.from(files).map(async (file) => {
          const image = await fileToDataUrl(file);

          return {
            ...createEmptyDesign(),
            image,
            images: [{ url: image, color: "" }],
          };
        }),
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
        products: current.products.map((product, productIndex) => {
          if (productIndex !== index) {
            return product;
          }

          const normalizedProduct = normalizeDesign(product);
          const nextImages = normalizedProduct.images && normalizedProduct.images.length > 0
            ? normalizedProduct.images.map((imageItem, imageIndex) => (imageIndex === 0 ? { ...imageItem, url: image } : imageItem))
            : [{ url: image, color: "" }];

          return {
            ...normalizedProduct,
            image,
            images: nextImages,
          };
        }),
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

  const handleAddDesignGalleryImages = async (designIndex: number, files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    setError(null);
    setIsUploadingImages(true);

    try {
      const uploadedImages = await Promise.all(
        Array.from(files).map(async (file) => ({
          url: await fileToDataUrl(file),
          color: "",
        })),
      );

      setForm((current) => ({
        ...current,
        products: current.products.map((product, productIndex) => {
          if (productIndex !== designIndex) {
            return product;
          }

          const normalizedProduct = normalizeDesign(product);
          const nextImages = [...(normalizedProduct.images ?? []), ...uploadedImages];
          return {
            ...normalizedProduct,
            image: normalizedProduct.image || nextImages[0]?.url || "",
            images: nextImages,
          };
        }),
      }));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleReplaceDesignGalleryImage = async (designIndex: number, imageIndex: number, file: File | null) => {
    if (!file) {
      return;
    }

    setError(null);
    setIsUploadingImages(true);

    try {
      const uploadedImage = await fileToDataUrl(file);
      setForm((current) => ({
        ...current,
        products: current.products.map((product, productIndex) => {
          if (productIndex !== designIndex) {
            return product;
          }

          const normalizedProduct = normalizeDesign(product);
          const nextImages = (normalizedProduct.images ?? []).map((imageItem, currentImageIndex) => (
            currentImageIndex === imageIndex ? { ...imageItem, url: uploadedImage } : imageItem
          ));

          return {
            ...normalizedProduct,
            image: imageIndex === 0 ? uploadedImage : nextImages[0]?.url || normalizedProduct.image,
            images: nextImages,
          };
        }),
      }));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleRemoveDesignGalleryImage = (designIndex: number, imageIndex: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => {
        if (productIndex !== designIndex) {
          return product;
        }

        const normalizedProduct = normalizeDesign(product);
        const nextImages = (normalizedProduct.images ?? []).filter((_, currentImageIndex) => currentImageIndex !== imageIndex);

        return {
          ...normalizedProduct,
          image: nextImages[0]?.url || "",
          images: nextImages,
        };
      }),
    }));
  };

  const handleDesignImageBindingChange = (designIndex: number, imageIndex: number, color: string) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => {
        if (productIndex !== designIndex) {
          return product;
        }

        const normalizedProduct = normalizeDesign(product);
        return {
          ...normalizedProduct,
          images: (normalizedProduct.images ?? []).map((imageItem, currentImageIndex) => (
            currentImageIndex === imageIndex ? { ...imageItem, color } : imageItem
          )),
        };
      }),
    }));
  };

  const handleAddDesignColor = (designIndex: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => (
        productIndex === designIndex
          ? {
              ...normalizeDesign(product),
              colors: [...(normalizeDesign(product).colors ?? []), ""],
            }
          : product
      )),
    }));
  };

  const handleDesignColorChange = (designIndex: number, colorIndex: number, value: string) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => {
        if (productIndex !== designIndex) {
          return product;
        }

        const normalizedProduct = normalizeDesign(product);
        const existingColors = [...(normalizedProduct.colors ?? [])];
        const previousColor = existingColors[colorIndex] ?? "";
        existingColors[colorIndex] = value;

        return {
          ...normalizedProduct,
          colors: existingColors,
          images: (normalizedProduct.images ?? []).map((imageItem) => (
            imageItem.color === previousColor ? { ...imageItem, color: value.trim() } : imageItem
          )),
        };
      }),
    }));
  };

  const handleRemoveDesignColor = (designIndex: number, colorIndex: number) => {
    setForm((current) => ({
      ...current,
      products: current.products.map((product, productIndex) => {
        if (productIndex !== designIndex) {
          return product;
        }

        const normalizedProduct = normalizeDesign(product);
        const existingColors = [...(normalizedProduct.colors ?? [])];
        const removedColor = existingColors[colorIndex] ?? "";
        const nextColors = existingColors.filter((_, currentColorIndex) => currentColorIndex !== colorIndex);

        return {
          ...normalizedProduct,
          colors: nextColors,
          images: (normalizedProduct.images ?? []).map((imageItem) => (
            imageItem.color === removedColor ? { ...imageItem, color: "" } : imageItem
          )),
        };
      }),
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
                {form.products.map((product, index) => {
                  const normalizedProduct = normalizeDesign(product);

                  return (
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
                            {normalizedProduct.image ? (
                              <img src={normalizedProduct.image} alt={product.title || `Design ${index + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#64748b" }}>
                                <ImagePlus />
                              </div>
                            )}
                          </div>

                          <label style={{ display: "block", marginTop: "0.75rem" }}>
                            Replace cover image
                            <input className="input" type="file" accept="image/*" onChange={(event) => void handleReplaceDesignImage(index, event.target.files?.[0] ?? null)} />
                          </label>

                          <label style={{ display: "block", marginTop: "0.75rem" }}>
                            Add more design photos
                            <input className="input" type="file" accept="image/*" multiple onChange={(event) => void handleAddDesignGalleryImages(index, event.target.files)} />
                          </label>

                          <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                            {(normalizedProduct.images ?? []).map((imageItem, imageIndex) => (
                              <div key={`${product.id ?? `design-${index}`}-image-${imageIndex}`} className="card" style={{ padding: "0.75rem" }}>
                                <div style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: "12px", overflow: "hidden", background: "rgba(15, 23, 42, 0.08)", border: "1px solid rgba(148, 163, 184, 0.2)" }}>
                                  <img src={imageItem.url} alt={`${product.title || `Design ${index + 1}`} ${imageIndex + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>

                                <label style={{ display: "block", marginTop: "0.75rem" }}>
                                  Bind this photo to a color
                                  <select className="select" value={imageItem.color ?? ""} onChange={(event) => handleDesignImageBindingChange(index, imageIndex, event.target.value)}>
                                    <option value="">No color binding</option>
                                    {(normalizedProduct.colors ?? []).filter(Boolean).map((color) => (
                                      <option key={`${product.id ?? `design-${index}`}-${color}`} value={color}>
                                        {color}
                                      </option>
                                    ))}
                                  </select>
                                </label>

                                <div style={{ display: "grid", gap: "0.75rem", marginTop: "0.75rem" }}>
                                  <label>
                                    Replace this photo
                                    <input className="input" type="file" accept="image/*" onChange={(event) => void handleReplaceDesignGalleryImage(index, imageIndex, event.target.files?.[0] ?? null)} />
                                  </label>
                                  <button className="button secondary" type="button" onClick={() => handleRemoveDesignGalleryImage(index, imageIndex)}>
                                    <Trash2 />
                                    Remove photo
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
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

                          <div className="card" style={{ padding: "1rem", borderRadius: "16px" }}>
                            <div className="section-row" style={{ marginBottom: "0.75rem" }}>
                              <div>
                                <p className="section-subtitle" style={{ margin: 0 }}>Colors</p>
                                <p className="section-subtitle" style={{ margin: "0.35rem 0 0" }}>
                                  Add color names like Gold, Silver, Green, or Maroon.
                                </p>
                              </div>
                              <button className="button secondary" type="button" onClick={() => handleAddDesignColor(index)}>
                                <Plus />
                                Add color
                              </button>
                            </div>

                            <div style={{ display: "grid", gap: "0.75rem" }}>
                              {(normalizedProduct.colors ?? []).map((color, colorIndex) => (
                                <div key={`${product.id ?? `design-${index}`}-color-${colorIndex}`} style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                                  <input
                                    className="input"
                                    value={color}
                                    placeholder={`Color ${colorIndex + 1}`}
                                    onChange={(event) => handleDesignColorChange(index, colorIndex, event.target.value)}
                                  />
                                  <button className="button secondary" type="button" onClick={() => handleRemoveDesignColor(index, colorIndex)}>
                                    <Trash2 />
                                  </button>
                                </div>
                              ))}

                              {(normalizedProduct.colors ?? []).length === 0 ? (
                                <p className="section-subtitle" style={{ margin: 0 }}>
                                  No colors added yet. You can still upload photos first and bind them later.
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <label>
                            Design description
                            <textarea className="textarea" value={normalizedProduct.description ?? ""} onChange={(event) => handleDesignChange(index, "description", event.target.value)} rows={4} />
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
                  );
                })}
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
