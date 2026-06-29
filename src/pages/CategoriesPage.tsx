import { useRef, useState } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { uploadImageFile } from "@/lib/image-utils";
import { getErrorMessage } from "@/lib/api";
import type { Category, CategoryDesign } from "@/lib/types";

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function mergeEditableColors(colors: string[] | undefined, imageColors: string[]) {
  const nextColors = (colors ?? []).map((color) => color ?? "");
  const knownColors = new Set(nextColors.map((color) => color.trim()).filter(Boolean));

  imageColors.forEach((color) => {
    const trimmedColor = color.trim();
    if (!trimmedColor || knownColors.has(trimmedColor)) {
      return;
    }

    nextColors.push(trimmedColor);
    knownColors.add(trimmedColor);
  });

  return nextColors.length > 0 ? nextColors : [""];
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

  const colors = mergeEditableColors(product.colors, images.map((image) => image.color ?? ""));

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
    basePrice: 0,
    deliveryCharge: 0,
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
  const isSubmitLockedRef = useRef(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitLockedRef.current || isUploadingImages) {
      return;
    }

    isSubmitLockedRef.current = true;
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
          basePrice: Math.max(0, Number(normalizedProduct.basePrice || 0)),
          deliveryCharge: Math.max(0, Number(normalizedProduct.deliveryCharge || 0)),
          description: normalizedProduct.description?.trim() || "",
          position: index,
        };
      });

      const savedCategory = await onSave(
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

      if (editSlug) {
        setForm({
          name: savedCategory.name,
          description: savedCategory.description,
          image: savedCategory.image || "",
          products: createLegacyDesigns(savedCategory),
        });
        setEditSlug(savedCategory.slug);
      } else {
        setForm(createEmptyForm());
        setEditSlug(null);
      }
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      isSubmitLockedRef.current = false;
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
      const image = await uploadImageFile(file);
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
          const image = await uploadImageFile(file);

          return {
            ...createEmptyDesign(),
            image,
            images: [{ url: image, color: "" }],
          };
        }),
      );

      setForm((current) => ({
        ...current,
        products: [...newDesigns, ...current.products],
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
          url: await uploadImageFile(file),
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
      const uploadedImage = await uploadImageFile(file);
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
        const previousTrimmedColor = previousColor.trim();

        return {
          ...normalizedProduct,
          colors: existingColors,
          images: previousTrimmedColor
            ? (normalizedProduct.images ?? []).map((imageItem) => (
              imageItem.color?.trim() === previousTrimmedColor ? { ...imageItem, color: value.trim() } : imageItem
            ))
            : normalizedProduct.images ?? [],
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
        const removedTrimmedColor = removedColor.trim();

        return {
          ...normalizedProduct,
          colors: nextColors.length > 0 ? nextColors : [""],
          images: removedTrimmedColor
            ? (normalizedProduct.images ?? []).map((imageItem) => (
              imageItem.color?.trim() === removedTrimmedColor ? { ...imageItem, color: "" } : imageItem
            ))
            : normalizedProduct.images ?? [],
        };
      }),
    }));
  };

  const handleAddEmptyDesign = () => {
    setForm((current) => ({
      ...current,
      products: [createEmptyDesign(), ...current.products],
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
                  const colorInputs = normalizedProduct.colors ?? [""];
                  const colorOptions = dedupeStrings(colorInputs);
                  const imageCount = (normalizedProduct.images ?? []).length;
                  const designHeading = product.title?.trim() || `Untitled design ${index + 1}`;
                  const discountPercent = normalizedProduct.basePrice && normalizedProduct.basePrice > normalizedProduct.price
                    ? Math.round(((normalizedProduct.basePrice - normalizedProduct.price) / normalizedProduct.basePrice) * 100)
                    : 0;

                  return (
                    <div key={product.id ?? `design-${index}`} className="design-editor card padding-lg">
                      <div className="design-editor-header">
                        <div className="design-editor-heading">
                          <p className="design-editor-kicker">Design {index + 1}</p>
                          <h3 className="design-editor-title">{designHeading}</h3>
                          <p className="design-editor-copy">Edit the photos, color options, pricing, and storefront details for this design.</p>
                        </div>

                        <div className="design-editor-actions">
                          {imageCount > 0 ? (
                            <span className="badge design-badge-muted">{imageCount} photo{imageCount === 1 ? "" : "s"}</span>
                          ) : null}
                          {colorOptions.length > 0 ? (
                            <span className="badge design-badge-muted">{colorOptions.length} color{colorOptions.length === 1 ? "" : "s"}</span>
                          ) : null}
                          {discountPercent > 0 ? (
                            <span className="badge">{discountPercent}% off</span>
                          ) : null}
                          <button className="button button-compact" type="submit" disabled={isSubmitting || isUploadingImages}>
                            {isSubmitting ? "Saving..." : "Save category"}
                          </button>
                          <button className="button secondary button-compact" type="button" onClick={() => handleRemoveDesign(index)}>
                            <Trash2 />
                            Remove
                          </button>
                        </div>
                      </div>

                      <div className="design-editor-body">
                        <div className="design-photo-panel">
                          <div className="design-panel-header">
                            <div>
                              <p className="design-panel-title">Design photos</p>
                              <p className="design-panel-copy">
                                Upload multiple photos and bind any of them to a color. The first photo becomes the main cover on the website.
                              </p>
                            </div>
                            <label className="button secondary button-compact">
                              <Plus />
                              Add photos
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                style={{ display: "none" }}
                                onChange={(event) => void handleAddDesignGalleryImages(index, event.target.files)}
                              />
                            </label>
                          </div>

                          {(normalizedProduct.images ?? []).length > 0 ? (
                            <div className="design-photo-list">
                              {(normalizedProduct.images ?? []).map((imageItem, imageIndex) => (
                                <div key={`${product.id ?? `design-${index}`}-image-${imageIndex}`} className="design-photo-card">
                                  <div className="design-photo-thumb-wrap">
                                    <img
                                      src={imageItem.url}
                                      alt={`${product.title || `Design ${index + 1}`} ${imageIndex + 1}`}
                                      className="design-photo-thumb"
                                    />
                                    {imageIndex === 0 ? <span className="badge design-photo-badge">Primary</span> : null}
                                  </div>

                                  <div className="design-photo-content">
                                    <div className="design-photo-heading">
                                      <div>
                                        <p className="design-photo-title">{imageIndex === 0 ? "Cover photo" : `Photo ${imageIndex + 1}`}</p>
                                        <p className="design-photo-caption">
                                          {imageItem.color?.trim() ? `Bound to ${imageItem.color}` : "No color linked yet"}
                                        </p>
                                      </div>
                                    </div>

                                    <label className="design-photo-field">
                                      Bind photo to color
                                      <select className="select" value={imageItem.color ?? ""} onChange={(event) => handleDesignImageBindingChange(index, imageIndex, event.target.value)}>
                                        <option value="">No color binding</option>
                                        {colorOptions.map((color) => (
                                          <option key={`${product.id ?? `design-${index}`}-${color}`} value={color}>
                                            {color}
                                          </option>
                                        ))}
                                      </select>
                                    </label>

                                    <div className="design-photo-actions">
                                      <label className="button secondary button-compact">
                                        Replace
                                        <input
                                          type="file"
                                          accept="image/*"
                                          style={{ display: "none" }}
                                          onChange={(event) => void handleReplaceDesignGalleryImage(index, imageIndex, event.target.files?.[0] ?? null)}
                                        />
                                      </label>
                                      <button className="button secondary button-compact" type="button" onClick={() => handleRemoveDesignGalleryImage(index, imageIndex)}>
                                        <Trash2 />
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="design-photo-empty">
                              <div>
                                <ImagePlus />
                                <p className="design-photo-empty-title">No photos added yet</p>
                                <p className="design-photo-empty-copy">Use the add photos button to upload the first image for this design.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="design-detail-panel">
                          <div className="design-field-grid">
                            <label className="field-span-2">
                              Design name
                              <input className="input" value={product.title} onChange={(event) => handleDesignChange(index, "title", event.target.value)} required />
                            </label>

                            <label>
                              Selling price
                              <input className="input" type="number" min={1} value={product.price} onChange={(event) => handleDesignChange(index, "price", Number(event.target.value))} required />
                            </label>

                            <label>
                              Original price
                              <input className="input" type="number" min={0} value={normalizedProduct.basePrice ?? 0} onChange={(event) => handleDesignChange(index, "basePrice", Number(event.target.value))} />
                            </label>

                            <label>
                              Delivery charge
                              <input className="input" type="number" min={0} value={normalizedProduct.deliveryCharge ?? 0} onChange={(event) => handleDesignChange(index, "deliveryCharge", Number(event.target.value))} />
                              <small className="section-subtitle">Leave 0 to use the default delivery charge from Settings.</small>
                            </label>

                            <div className="design-summary-card">
                              <span className="design-summary-label">Storefront setup</span>
                              <div className="design-summary-values">
                                <div>
                                  <strong>{imageCount}</strong>
                                  <span>photo{imageCount === 1 ? "" : "s"}</span>
                                </div>
                                <div>
                                  <strong>{colorOptions.length}</strong>
                                  <span>color{colorOptions.length === 1 ? "" : "s"}</span>
                                </div>
                              </div>
                            </div>

                            <div className="card design-colors-card field-span-2">
                              <div className="design-panel-header design-panel-header-tight">
                                <div>
                                  <p className="design-panel-title">Colors</p>
                                  <p className="design-panel-copy">
                                    Add names like Gold, Silver, Green, or Maroon. These will appear as selectable options on the website.
                                  </p>
                                </div>
                                <button className="button secondary button-compact" type="button" onClick={() => handleAddDesignColor(index)}>
                                  <Plus />
                                  Add color
                                </button>
                              </div>

                              <div className="design-color-list">
                                {colorInputs.map((color, colorIndex) => (
                                  <div key={`${product.id ?? `design-${index}`}-color-${colorIndex}`} className="design-color-row">
                                    <input
                                      className="input"
                                      value={color}
                                      placeholder={`Color ${colorIndex + 1}`}
                                      onChange={(event) => handleDesignColorChange(index, colorIndex, event.target.value)}
                                    />
                                    {colorInputs.length > 1 || color.trim() ? (
                                      <button className="button secondary button-icon" type="button" onClick={() => handleRemoveDesignColor(index, colorIndex)} aria-label={`Remove color ${colorIndex + 1}`}>
                                        <Trash2 />
                                      </button>
                                    ) : <div />}
                                  </div>
                                ))}
                              </div>
                            </div>

                            <label className="field-span-2">
                              Design description
                              <textarea className="textarea" value={normalizedProduct.description ?? ""} onChange={(event) => handleDesignChange(index, "description", event.target.value)} rows={5} />
                            </label>

                            <div className="design-toggle-grid field-span-2">
                              <label className={product.featured ? "design-toggle design-toggle-active" : "design-toggle"}>
                                <input type="checkbox" checked={product.featured} onChange={(event) => handleDesignChange(index, "featured", event.target.checked)} />
                                <div>
                                  <span className="design-toggle-title">Featured product</span>
                                  <span className="design-toggle-copy">Show this design in the featured section.</span>
                                </div>
                              </label>

                              <label className={product.hotSelling ? "design-toggle design-toggle-active" : "design-toggle"}>
                                <input type="checkbox" checked={product.hotSelling} onChange={(event) => handleDesignChange(index, "hotSelling", event.target.checked)} />
                                <div>
                                  <span className="design-toggle-title">Hot selling product</span>
                                  <span className="design-toggle-copy">Highlight this design in the hot selling section.</span>
                                </div>
                              </label>
                            </div>
                          </div>
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
