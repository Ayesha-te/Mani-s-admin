import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { fileToDataUrl } from "@/lib/image-utils";
import { getErrorMessage } from "@/lib/api";
import type { FeaturedItem } from "@/lib/types";

export function FeaturedPage({
  featured,
  onCreate,
  onDelete,
}: {
  featured: FeaturedItem[];
  onCreate: (payload: FeaturedItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ title: "", image: "", imageFile: null as File | null });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const imageData = form.imageFile ? await fileToDataUrl(form.imageFile) : form.image;
      await onCreate({
        title: form.title,
        image: imageData,
      });
      setForm({ title: "", image: "", imageFile: null });
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this featured item?")) {
      return;
    }

    setDeletingId(id);
    setError(null);

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
            <p className="section-subtitle">Featured pieces</p>
            <h2 className="section-title">Featured</h2>
          </div>
        </div>

        <div className="form-grid">
          <form className="card padding-lg" onSubmit={handleSubmit}>
            <p className="section-subtitle">Add featured item</p>
            <div className="form-row">
              <label>
                Title
                <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} required />
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

            <button className="button" type="submit" disabled={isSubmitting}>
              <Plus />
              {isSubmitting ? "Adding..." : "Add featured item"}
            </button>
          </form>

          <div className="card padding-lg">
            <p className="section-subtitle">Featured list</p>
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Image</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {featured.map((item) => (
                  <tr key={item.id ?? item.title}>
                    <td>{item.title}</td>
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
