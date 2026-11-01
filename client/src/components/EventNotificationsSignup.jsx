
import { useState } from "react";
import { Bell, Mail } from "lucide-react";

export default function EventNotificationsSignup({ compact = false }) {
  const [email, setEmail] = useState("");
  const [categories, setCategories] = useState(["All"]);
  const [status, setStatus] = useState("");

  const toggleCategory = (category) => {
    if (category === "All") return setCategories(["All"]);
    setCategories((current) => {
      const list = current.filter((item) => item !== "All");
      const next = list.includes(category) ? list.filter((item) => item !== category) : [...list, category];
      return next.length ? next : ["All"];
    });
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Subscribing…");
    const response = await fetch("/api/event-notifications/subscribe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, categories }),
    });
    const payload = await response.json();
    if (!response.ok) return setStatus(payload.error || "Something went wrong.");
    setStatus(payload.message);
    setEmail("");
  };

  const options = ["All", "Candles", "Crafts", "Seasonal", "Private Events"];

  return (
    <section className={`event-alert-card ${compact ? "compact" : ""}`}>
      <div className="event-alert-icon"><Bell size={20} /></div>
      <div className="event-alert-content">
        <div className="mini-overline">NEW EVENT ALERTS</div>
        <h2>Be first to know what Bloom is making next.</h2>
        <p>Get an email when new workshops, seasonal events, and private-event opportunities are announced.</p>
        {!compact && (
          <div className="notification-category-row">
            {options.map((option) => (
              <button type="button" key={option} className={categories.includes(option) ? "active" : ""} onClick={() => toggleCategory(option)}>{option}</button>
            ))}
          </div>
        )}
        <form className="event-alert-form" onSubmit={submit}>
          <div className="event-alert-input"><Mail size={16} /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" /></div>
          <button className="brick-button" type="submit">Notify Me</button>
        </form>
        {status && <small className="form-status">{status}</small>}
      </div>
    </section>
  );
}

