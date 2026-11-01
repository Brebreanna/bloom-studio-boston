import { useState } from "react";
import { Link } from "react-router-dom";
import { useBusiness } from "./useBusiness.js";

export default function Footer() {
  const { business } = useBusiness();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");

  const subscribe = async (event) => {
    event.preventDefault();
    setStatus("Saving…");

    const response = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error || "Something went wrong");
      return;
    }

    setStatus(payload.message);
    setEmail("");
  };

  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div>
          <img src="/images/bloom-logo.png" className="footer-logo" alt="" />
          <p>
            A welcoming creative studio for hands-on workshops, private gatherings,
            ready-made art, and time spent making something beautiful together.
          </p>
        </div>

        <div>
          <h4>Visit</h4>
          <span>{business?.address || "Boston, MA"}</span>
          {business?.locationNote && <small>{business.locationNote}</small>}
          <a href={`mailto:${business?.email || "Contact@bloomstudioboston.com"}`}>{business?.email || "Contact@bloomstudioboston.com"}</a>
          <a href={business?.instagramUrl || "https://www.instagram.com/bloomstudioboston/"} target="_blank" rel="noreferrer">{business?.instagram || "@bloomstudioboston"}</a>
        </div>

        <div>
          <h4>Explore</h4>
          <Link to="/workshops">Workshops</Link>
          <Link to="/shop">Shop</Link>
          <Link to="/about">About</Link>
          <Link to="/private-events">Private Events</Link>
          <Link to="/membership">Membership</Link>
          <Link to="/account">Account</Link>
          <Link to="/faq">FAQ</Link>
        </div>

        <div>
          <h4>The Studio Note</h4>
          <p>Receive quiet updates on upcoming seasonal classes.</p>
          <form className="newsletter" onSubmit={subscribe}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your email address"
              required
            />
            <button type="submit">Subscribe</button>
          </form>
          {status && <small className="form-status">{status}</small>}
        </div>
      </div>
    </footer>
  );
}
