import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { uploadImageFile } from "@/lib/image-utils";
import { getErrorMessage } from "@/lib/api";
import type { Category, HotSellingItem } from "@/lib/types";

export function HotSellingPage({
  hotSelling,
  categories,
  onCreate,
  onDelete,
}: {
  hotSelling: HotSellingItem[];
  categories: Category[];
  onCreate: (payload: HotSellingItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: "", image: "", slug: categories[0]?.slug ?? "", imageFile: null as File | null });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!form.slug && categories[0]?.slug) {
      setForm((current) => ({ ...current, slug: categories[0]?.slug ?? "" }));
    }
  }, [categories, form.slug]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const imageData = form.imageFile ? await uploadImageFile(form.imageFile) : form.image;
      await onCreate({
        title: form.title,
        image: imageData,
        slug: form.slug,
      });
      setForm({ title: "", image: "", slug: categories[0]?.slug ?? "", imageFile: null });
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this hot selling item?")) {
      return;
    }

    setError(null);
    setDeletingId(id);

    try {
      await onDelete(id);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container">
      <section className="card padding-xl">
        <div className="section-row">
          <div>
            <p className="section-subtitle">Manage hot selling products</p>
            <h2 className="section-title">Hot Selling</h2>
          </div>
        </div>

        <div className="form-grid">
          <form className="card padding-lg" onSubmit={handleSubmit}>
            <p className="section-subtitle">Add a hot selling item</p>
            <div className="form-row">
              <label>
                Title
                <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
              </label>
              <label>
                Category
                <select className="select" value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} required>
                  <option value="" disabled>
                    Select a category
                  </option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Image file
                <input
                  className="input"
                  type="file"
                  accept="image/*"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      imageFile: event.target.files?.[0] ?? null,
                    }))
                  }
                  required
                />
              </label>
            </div>

            {error ? <p className="error-text">{error}</p> : null}

            <button className="button" type="submit" disabled={isSubmitting || categories.length === 0}>
              <Plus />
              {isSubmitting ? "Adding..." : "Add hot selling item"}
            </button>
          </form>

          <div className="card padding-lg">
            <p className="section-subtitle">Hot selling list</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {hotSelling.map((item) => (
                  <tr key={item.id ?? item.title}>
                    <td>{item.title}</td>
                    <td>{categories.find((category) => category.slug === item.slug)?.name ?? item.slug}</td>
                    <td>{item.image ? <a href={item.image} target="_blank" rel="noreferrer">View</a> : "-"}</td>
                    <td>
                      <button className="button secondary" type="button" onClick={() => item.id && handleDelete(item.id)} disabled={deletingId === item.id}>
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
