import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useWorkshop } from "../components/useWorkshops.js";
import { useCart } from "../context/CartContext.jsx";
import { TOKEN_KEY, useAuth } from "../context/AuthContext.jsx";
import { formatDate, formatTimeRange } from "../utils/dates.js";

export default function Booking() {
  const { slug } = useParams();
  const { workshop, loading } = useWorkshop(slug);
  const { addItem } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [membership, setMembership] = useState(null);
  const [memberStatus, setMemberStatus] = useState("");

  useEffect(() => {
    if (!user) { setMembership(null); return; }
    const token = localStorage.getItem(TOKEN_KEY);
    fetch("/api/membership/me", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.ok ? r.json() : { membership: null })
      .then((data) => setMembership(data.membership || null))
      .catch(() => setMembership(null));
  }, [user]);

  useEffect(() => {
    if (!workshop?.sessions?.length) return;
    const first = workshop.sessions[0];
    setSelectedDate(first.date);
    setSessionId(first.id);
  }, [workshop]);

  const availableDates = useMemo(() => {
    if (!workshop) return [];
    return [...new Set(workshop.sessions.map((session) => session.date))];
  }, [workshop]);

  const sessionsForDate = useMemo(() => {
    if (!workshop || !selectedDate) return [];
    return workshop.sessions.filter((session) => session.date === selectedDate);
  }, [workshop, selectedDate]);

  const selectedSession = workshop?.sessions?.find((session) => session.id === sessionId);
  const activePrice = selectedSession?.price ?? workshop?.price ?? 0;
  const maxGuests = Math.max(1, selectedSession?.spotsLeft || 1);

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxGuests));
  }, [maxGuests]);

  if (loading || !workshop) {
    return (
      <main className="shell section">
        <p>Loading workshop availability…</p>
      </main>
    );
  }

  const chooseDate = (date) => {
    setSelectedDate(date);
    const firstForDate = workshop.sessions.find((session) => session.date === date);
    setSessionId(firstForDate?.id || "");
  };


  const reserveWithCredit = async (useFriendPass = false) => {
    if (!sessionId || !user) return;
    setAdding(true); setMemberStatus("");
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const response = await fetch("/api/member/reservations", {
        method: "POST",
        headers: { "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ workshopId: workshop.id, sessionId, seats: quantity, useFriendPass }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Could not reserve with membership.");
      setMemberStatus(payload.message);
      setTimeout(() => navigate("/account"), 700);
    } catch (error) { setMemberStatus(error.message); }
    finally { setAdding(false); }
  };

  const addToCart = async () => {
    if (!sessionId) return;
    setAdding(true);

    try {
      await addItem({
        workshopId: workshop.id,
        sessionId,
        quantity,
      });
      navigate("/cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="shell booking-layout section">
      <section className="booking-product-card">
        <img src={workshop.image} alt={workshop.title} />

        <div>
          <div className="mini-overline">ARTISAN WORKSHOP</div>
          <h2>{workshop.title}</h2>
          <p>
            ${activePrice} / guest · {workshop.location}
          </p>
        </div>
      </section>

      <section className="booking-form-card">
        <div className="mini-overline">LIVE AVAILABILITY</div>
        <h1>Select Date & Guests</h1>

        <div className="booking-date-grid" aria-label="Available dates">
          {availableDates.slice(0, visibleCount).map((date) => (
            <button
              type="button"
              key={date}
              className={selectedDate === date ? "active" : ""}
              onClick={() => chooseDate(date)}
            >
              <span>{formatDate(date, { weekday: "short", month: "short", day: "numeric" })}</span>
            </button>
          ))}
        </div>

        {visibleCount < availableDates.length && (
          <button
            type="button"
            className="show-more-dates"
            onClick={() => setVisibleCount((count) => count + 8)}
          >
            Show more dates
          </button>
        )}

        <div className="session-list">
          {sessionsForDate.map((session) => (
            <label
              className={sessionId === session.id ? "selected" : ""}
              key={session.id}
            >
              <input
                type="radio"
                name="session"
                checked={sessionId === session.id}
                onChange={() => setSessionId(session.id)}
              />

              <div>
                <strong>{formatDate(session.date)}</strong>
                <span>{formatTimeRange(session)}</span>
              </div>

              <em>{session.spotsLeft} spots left</em>
            </label>
          ))}
        </div>

        <div className="guest-stepper">
          <div>
            <strong>Number of Guests</strong>
            <span>Choose how many seats to add</span>
          </div>

          <div className="counter">
            <button
              type="button"
              aria-label="Decrease guests"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              −
            </button>

            <span>{quantity}</span>

            <button
              type="button"
              aria-label="Increase guests"
              onClick={() => setQuantity(Math.min(maxGuests, quantity + 1))}
            >
              +
            </button>
          </div>
        </div>

        <div className="live-total">
          <span>
            {quantity} × ${activePrice}
          </span>
          <strong>${(quantity * activePrice).toFixed(2)}</strong>
        </div>

        <button className="brick-button full" type="button" onClick={addToCart} disabled={adding || !sessionId}>
          {adding ? "Adding…" : "Pay Full Price / Add to Cart"}
        </button>

        {membership && (
          <div className="member-reserve-box">
            <div><span className="mini-overline">BLOOM CLUB</span><strong>{membership.planName}</strong></div>
            <p>{membership.workshopCredits} workshop credit{membership.workshopCredits === 1 ? "" : "s"} available · {membership.discountPercent}% member savings.</p>
            <button className="outline-button full" type="button" onClick={() => reserveWithCredit(false)} disabled={adding || !sessionId || membership.workshopCredits < quantity}>
              Use {quantity} Membership Credit{quantity === 1 ? "" : "s"} & Reserve
            </button>
            {membership.friendPassesRemaining > 0 && quantity === 1 && <button className="text-button" type="button" onClick={() => reserveWithCredit(true)}>Use annual friend pass instead</button>}
          </div>
        )}
        {!user && <p className="member-login-note">Bloom Club member? Sign in first to reserve with credits.</p>}
        {memberStatus && <p className="form-status">{memberStatus}</p>}
      </section>
    </main>
  );
}
