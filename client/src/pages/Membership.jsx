import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer.jsx";
import { TOKEN_KEY, useAuth } from "../context/AuthContext.jsx";

export default function Membership() {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [billing, setBilling] = useState("monthly");
  const [selected, setSelected] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [status, setStatus] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    fetch("/api/membership").then((r) => r.json()).then((data) => {
      setConfig(data);
      if (data.plans?.[0]) setSelected(data.plans[0].key);
    });
  }, []);
  useEffect(() => { if (user?.email) setEmail(user.email); }, [user]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("joined") === "1") {
      setStatus("Thanks for joining Bloom Club. Your membership will appear in your account as soon as Square confirms the subscription.");
    }
  }, []);

  const selectedPlan = useMemo(() => config?.plans?.find((p) => p.key === selected), [config, selected]);

  const join = async (event) => {
    event.preventDefault();
    setJoining(true);
    setStatus("Opening secure membership checkout…");
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch("/api/membership/checkout", {
        method: "POST",
        headers: { "Content-Type":"application/json", ...(token ? { Authorization:`Bearer ${token}` } : {}) },
        body: JSON.stringify({ email, planKey: selected, billingInterval: billing }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Membership checkout could not be started.");
      window.location.assign(payload.url);
    } catch (error) {
      setStatus(error.message);
      setJoining(false);
    }
  };

  if (!config) return <main className="shell section"><p>Loading Bloom Club…</p></main>;

  return <main>
    <section className="shell membership-hero section membership-rework">
      <div className="membership-copy">
        <div className="mini-overline">BLOOM CLUB</div>
        <h1>Come back to make more.</h1>
        <p>{config.description}</p>
        <div className="billing-toggle" aria-label="Billing frequency">
          <button type="button" className={billing === "monthly" ? "active" : ""} onClick={() => setBilling("monthly")}>Monthly</button>
          <button type="button" className={billing === "annual" ? "active" : ""} onClick={() => setBilling("annual")}>Annual</button>
        </div>
      </div>

      <div className="membership-tier-grid">
        {config.plans.map((plan) => {
          const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
          const formattedPrice = Number(price).toLocaleString("en-US");
          return <button type="button" key={plan.key} className={`membership-tier ${selected === plan.key ? "selected" : ""}`} onClick={() => setSelected(plan.key)}>
            <span className="mini-overline">{plan.monthlyCredits} CREDIT{plan.monthlyCredits === 1 ? "" : "S"} / MONTH</span>
            <h2>{plan.name}</h2>
            <div className="membership-price" aria-label={`$${formattedPrice} per ${billing === "annual" ? "year" : "month"}`}><strong>${formattedPrice}</strong><span>per {billing === "annual" ? "year" : "month"}</span></div>
            <ul>{plan.benefits.map((b) => <li key={b}>✓ {b}</li>)}</ul>
          </button>;
        })}
      </div>

      <form className="membership-interest-form membership-signup" onSubmit={join}>
        <div>
          <div className="mini-overline">JOIN BLOOM CLUB</div>
          <h2>{selectedPlan ? `${selectedPlan.name} · ${billing}` : "Choose a plan"}</h2>
          <p>Choose your plan and continue to secure Square checkout. Members still reserve a specific workshop date so Bloom always has an accurate headcount; when a credit is available, that reservation does not require an additional payment.</p>
        </div>
        {!user && <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" />}
        <button className="brick-button" type="submit" disabled={joining}>{joining ? "Opening Checkout…" : `Join ${selectedPlan?.name || "Bloom Club"}`}</button>
        {status && <p className="form-status">{status}</p>}
      </form>
      <small className="membership-note">Annual plans renew yearly. Monthly plans renew monthly. Membership checkout is securely handled by Square.</small>
    </section>
    <Footer />
  </main>;
}
