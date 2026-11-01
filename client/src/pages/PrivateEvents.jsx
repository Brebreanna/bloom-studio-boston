import { useRef, useState } from "react";
import Footer from "../components/Footer.jsx";
import PageIntro from "../components/PageIntro.jsx";
import StudioMap from "../components/StudioMap.jsx";

const eventTypes = [
  {
    title: "Birthdays & Bachelorettes",
    value: "Birthday & Milestone",
    text: "Celebrate with sweets, botanical candle pouring, or creative handcrafting alongside your closest friends."
  },
  {
    title: "Team & Corporate Retreats",
    value: "Corporate Retreat",
    text: "Step away from digital screens and reconnect through tactile, mindful artistry and collaborative making."
  },
  {
    title: "Bespoke Celebrations",
    value: "Other",
    text: "Custom-tailor your medium—from Venetian gilding and botanical pressing to heirloom charm design."
  }
];

export default function PrivateEvents() {
  const formRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    celebrationType: "Birthday & Milestone",
    preferredDate: "",
    guestCount: 6,
    notes: "",
  });

  const [status, setStatus] = useState("");
  const [selectedType, setSelectedType] = useState("Birthday & Milestone");

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const chooseEventType = (value) => {
    setSelectedType(value);
    setForm((current) => ({ ...current, celebrationType: value }));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (event) => {
    event.preventDefault();
    setStatus("Sending…");

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatus(payload.error || "Something went wrong");
        return;
      }

      setStatus(payload.message || "Your inquiry was submitted.");
      setForm({
        name: "",
        email: "",
        celebrationType: selectedType,
        preferredDate: "",
        guestCount: 6,
        notes: "",
      });
    } catch {
      setStatus("Unable to submit right now. Please try again.");
    }
  };

  return (
    <main>
      <PageIntro
        badge="CELEBRATE & CONNECT"
        title="Private Events & Inquiries"
        text="Host birthdays, bachelorettes, team retreats, or bespoke gatherings with a creative experience designed around your group."
      />

      <section className="shell event-hero section compact-top">
        <div className="event-photo">
          <img
            src="/images/people-candle-workshop.png"
            alt="Private Bloom Studio gathering"
          />

          <div>
            <span>PRIVATE BLOOM EXPERIENCE</span>
            <h2>Unforgettable communal moments framed in craft.</h2>

            <button
              type="button"
              className="event-hero-cta"
              onClick={scrollToForm}
            >
              Plan Your Event
            </button>
          </div>
        </div>

        <div className="event-side-card">
          <p>
            An elevated private experience tailored exclusively for your circle.
            Gather 6 to 24 guests for a private Bloom experience. Venue details are confirmed with your event plan.
          </p>

          <div className="stat-grid">
            <div>
              <strong>Custom</strong>
              <span>CRAFT</span>
            </div>

            <div>
              <strong>Private</strong>
              <span>VIBE</span>
            </div>

            <div>
              <strong>6–24</strong>
              <span>GUESTS</span>
            </div>
          </div>

          <button
            type="button"
            className="outline-button full"
            onClick={scrollToForm}
          >
            Start an Inquiry
          </button>
        </div>
      </section>

      <section className="shell event-content-grid section compact-top">
        <div>
          <div className="section-heading">
            <h2>Curated Gatherings</h2>
            <span>Choose an event type</span>
          </div>

          <div className="event-type-list interactive-event-types">
            {eventTypes.map((eventType) => (
              <button
                type="button"
                key={eventType.title}
                className={selectedType === eventType.value ? "selected" : ""}
                onClick={() => chooseEventType(eventType.value)}
              >
                <div>
                  <h3>{eventType.title}</h3>
                  <p>{eventType.text}</p>
                  <span className="event-select-label">
                    {selectedType === eventType.value
                      ? "Selected ✓"
                      : "Select this event →"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <form
          id="private-event-form"
          ref={formRef}
          className="inquiry-card"
          onSubmit={submit}
        >
          <div className="mini-overline">TELL US YOUR GATHERING</div>
          <h2>Event Request Form</h2>

          <p>
            Share your plans with us. Your inquiry is submitted to the Bloom
            Studio backend.
          </p>

          <label>
            Organizer Full Name
            <input
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              required
              placeholder="Your name"
            />
          </label>

          <label>
            Email Address
            <input
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              type="email"
              required
              placeholder="you@example.com"
            />
          </label>

          <label>
            Celebration Type
            <select
              value={form.celebrationType}
              onChange={(event) => {
                update("celebrationType", event.target.value);
                setSelectedType(event.target.value);
              }}
            >
              <option value="Birthday & Milestone">Birthday & Milestone</option>
              <option value="Bachelorette">Bachelorette</option>
              <option value="Corporate Retreat">Corporate Retreat</option>
              <option value="Bridal Shower">Bridal Shower</option>
              <option value="Other">Other / Bespoke</option>
            </select>
          </label>

          <div className="two-col-fields">
            <label>
              Preferred Date
              <input
                value={form.preferredDate}
                onChange={(event) => update("preferredDate", event.target.value)}
                type="date"
              />
            </label>

            <label>
              Guest Count
              <input
                value={form.guestCount}
                onChange={(event) => update("guestCount", event.target.value)}
                type="number"
                min="1"
                max="50"
              />
            </label>
          </div>

          <label>
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => update("notes", event.target.value)}
              placeholder="Share project ideas, dietary notes, or the vibe you're planning."
            />
          </label>

          <button className="brick-button full" type="submit">
            Send Private Event Inquiry
          </button>

          {status && <p className="form-status" role="status">{status}</p>}
        </form>
      </section>

      <section className="shell section compact-top">
        <div className="section-heading">
          <div>
            <div className="mini-overline">STUDIO LOCATION</div>
            <h2>Planning Your Bloom Event</h2>
          </div>
        </div>

        <StudioMap />
      </section>

      <Footer />
    </main>
  );
}
