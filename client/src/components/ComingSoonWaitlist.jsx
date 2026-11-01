
import { useEffect, useState } from "react";
import { Heart, MapPin, CalendarDays } from "lucide-react";

function WaitlistCard({ event }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [status, setStatus] = useState("");
  const [interestCount, setInterestCount] = useState(event.interestCount || 0);

  const submit = async (e) => {
    e.preventDefault();
    setStatus("Joining…");
    const response = await fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId: event.id, email, name, notifyByEmail }),
    });
    const payload = await response.json();
    if (!response.ok) return setStatus(payload.error || "Something went wrong.");
    setInterestCount(payload.interestCount);
    setStatus(payload.message);
  };

  return (
    <article className="waitlist-card">
      <img src={event.image} alt={event.title} />
      <div className="waitlist-card-body">
        <div className="waitlist-topline"><span>CONCEPT · COMING SOON</span><small>{interestCount} interested</small></div>
        <h3>{event.title}</h3><p>{event.description}</p>
        <div className="undated-event-meta"><span><CalendarDays size={14}/> Date TBD</span><span><MapPin size={14}/> Location TBD</span></div>
        <button type="button" className="brick-button full" onClick={() => setOpen((value) => !value)}><Heart size={15}/>{open ? "Close Waitlist" : "Join the Waitlist"}</button>
        {open && (
          <form className="waitlist-form" onSubmit={submit}>
            <label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
            <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
            <label className="waitlist-check"><input type="checkbox" checked={notifyByEmail} onChange={(e) => setNotifyByEmail(e.target.checked)} />Email me if Bloom schedules this workshop.</label>
            <button className="outline-button full" type="submit">Count Me In</button>
            {status && <small className="form-status">{status}</small>}
          </form>
        )}
      </div>
    </article>
  );
}

export default function ComingSoonWaitlist() {
  const [events, setEvents] = useState([]);
  useEffect(() => { fetch("/api/coming-soon-events").then((r) => r.json()).then(setEvents); }, []);
  if (!events.length) return null;
  return (
    <section className="coming-soon-section">
      <div className="section-heading"><div><div className="mini-overline">HELP VICKY CHOOSE WHAT'S NEXT</div><h2>Would you come to this?</h2></div></div>
      <p className="coming-soon-intro">These are workshop ideas Vicky is considering. They do not have a date or location yet. Join a waitlist to show interest — if enough people want it, Bloom can turn the idea into a real event.</p>
      <div className="waitlist-grid">{events.map((event) => <WaitlistCard key={event.id} event={event} />)}</div>
    </section>
  );
}

