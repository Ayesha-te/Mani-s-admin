import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginPage({
  onLogin,
  isAuthenticated,
}: {
  onLogin: (email: string, password: string) => Promise<string | null>;
  isAuthenticated: boolean;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const loginError = await onLogin(email.trim(), password);
    if (!loginError) {
      navigate("/", { replace: true });
      return;
    }

    setError(loginError);
    setIsSubmitting(false);
  };

  return (
    <div className="login-page">
      <div className="login-card card padding-xl">
        <h1 className="section-title">Admin Login</h1>
        <p className="section-subtitle">Sign in to manage categories, design items, featured pieces, hot selling items, and site settings.</p>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Email
            <input className="input" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="username" />
          </label>

          <label>
            Password
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" />
          </label>

          {error ? <p className="error-text">{error}</p> : null}

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
