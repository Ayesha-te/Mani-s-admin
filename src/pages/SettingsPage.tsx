import { useEffect, useState } from "react";
import type { SiteSettings } from "@/lib/types";
import { getErrorMessage } from "@/lib/api";

export function SettingsPage({
  settings,
  onSave,
}: {
  settings: SiteSettings;
  onSave: (payload: SiteSettings) => Promise<void>;
}) {
  const [form, setForm] = useState(settings);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await onSave(form);
    } catch (submissionError) {
      setError(getErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container">
      <section className="card padding-xl">
        <div className="section-row">
          <div>
            <p className="section-subtitle">Store settings</p>
            <h2 className="section-title">Contact and social links</h2>
          </div>
        </div>

        <form className="card padding-lg form-grid" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              WhatsApp number
              <input className="input" value={form.whatsappNumber} onChange={(event) => setForm((current) => ({ ...current, whatsappNumber: event.target.value }))} required />
            </label>
            <label>
              WhatsApp link
              <input className="input" value={form.whatsappLink} onChange={(event) => setForm((current) => ({ ...current, whatsappLink: event.target.value }))} required />
            </label>
            <label>
              Instagram handle
              <input className="input" value={form.instagram} onChange={(event) => setForm((current) => ({ ...current, instagram: event.target.value }))} required />
            </label>
            <label>
              Instagram link
              <input className="input" value={form.instagramLink} onChange={(event) => setForm((current) => ({ ...current, instagramLink: event.target.value }))} required />
            </label>
            <label>
              Facebook link
              <input className="input" value={form.facebookLink} onChange={(event) => setForm((current) => ({ ...current, facebookLink: event.target.value }))} required />
            </label>
            <label>
              TikTok link
              <input className="input" value={form.tiktokLink} onChange={(event) => setForm((current) => ({ ...current, tiktokLink: event.target.value }))} required />
            </label>
            <label>
              Email
              <input className="input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
            </label>
            <label>
              Address
              <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} required />
            </label>
            <label>
              Store hours
              <input className="input" value={form.storeHours} onChange={(event) => setForm((current) => ({ ...current, storeHours: event.target.value }))} required />
            </label>
          </div>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save settings"}
          </button>
        </form>
      </section>
    </div>
  );
}
