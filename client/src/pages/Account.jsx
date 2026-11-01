import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { TOKEN_KEY, useAuth } from "../context/AuthContext.jsx";

export default function Account() {
  const { user, loading, signup, login, logout } = useAuth();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [status, setStatus] = useState("");
  const [membership, setMembership] = useState(null);
  const [orders, setOrders] = useState([]);
  useEffect(() => {
    if (!user) { setMembership(null); setOrders([]); return; }
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/membership/me", { headers })
      .then((r) => r.ok ? r.json() : { membership: null })
      .then((data) => setMembership(data.membership || null));
    fetch("/api/account/orders", { headers })
      .then((r) => r.ok ? r.json() : { orders: [] })
      .then((data) => setOrders(data.orders || []));
  }, [user]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus(mode === "login" ? "Signing in…" : "Creating account…");

    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await signup(form);
      }
      setStatus("");
    } catch (error) {
      setStatus(error.message);
    }
  };

  if (loading) {
    return <main className="shell section"><p>Loading your account…</p></main>;
  }

  if (user) {
    return (
      <main>
        <section className="shell account-page section">
          <div className="mini-overline">WELCOME BACK</div>
          <h1>Hi, {user.name}.</h1>
          <p>
            Your Bloom account gives you one place for returning-customer access,
            booking history, membership benefits, and saved preferences.
          </p>

          <div className="account-dashboard">
            <div>
              <span>Account email</span>
              <strong>{user.email}</strong>
            </div>

            <div>
              <span>Membership</span>
              <strong>{membership ? `${membership.planName} · ${membership.workshopCredits} credit${membership.workshopCredits === 1 ? "" : "s"}` : "Not active"}</strong>
              {membership ? <small>{membership.discountPercent}% member discount · {membership.billingInterval} billing</small> : <Link to="/membership">Explore Bloom Club →</Link>}
            </div>

            <div>
              <span>Bookings</span>
              <strong>{orders.length ? `${orders.length} order${orders.length === 1 ? "" : "s"}` : "No orders yet"}</strong>
            </div>
          </div>

          {orders.length > 0 && <div className="account-orders">
            <h2>Recent orders</h2>
            {orders.slice(0, 6).map((order) => <article key={order.id}>
              <div><strong>{order.items.map((item) => item.title).join(", ")}</strong><span>{new Date(order.createdAt).toLocaleDateString()}</span></div>
              <strong>${Number(order.total).toFixed(2)}</strong>
            </article>)}
          </div>}

          <button className="outline-button" onClick={logout}>
            Sign Out
          </button>
        </section>

        <Footer />
      </main>
    );
  }

  return (
    <main>
      <section className="shell auth-layout section">
        <div className="auth-story">
          <div className="mini-overline">RETURNING TO BLOOM?</div>
          <h1>A little easier every time you come back.</h1>
          <p>
            Create an account to make repeat visits simpler, view bookings, and use Bloom Club benefits.
          </p>

          <img src="/images/people-candle-workshop.png" alt="Bloom Studio workshop" />
        </div>

        <form className="auth-card" onSubmit={submit}>
          <div className="auth-tabs">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Sign In
            </button>

            <button
              type="button"
              className={mode === "signup" ? "active" : ""}
              onClick={() => setMode("signup")}
            >
              Create Account
            </button>
          </div>

          {mode === "signup" && (
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                required
                placeholder="Your name"
              />
            </label>
          )}

          <label>
            Email
            <input
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Password
            <input
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              type="password"
              minLength="8"
              required
              placeholder="At least 8 characters"
            />
          </label>

          <button className="brick-button full" type="submit">
            {mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {status && <p className="form-status" role="status">{status}</p>}
        </form>
      </section>

      <Footer />
    </main>
  );
}
