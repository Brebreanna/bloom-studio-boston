import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { formatShortDate, formatTime } from "../utils/dates.js";

export default function WorkshopCard({ workshop, editorial = false, index = 0 }) {
  const nextSession = workshop.sessions?.[0];
  const [flipped, setFlipped] = useState(false);

  if (editorial) {
    return (
      <article className={`editorial-workshop-card editorial-workshop-${index + 1}`}>
        <button
          type="button"
          className={`editorial-workshop-flip ${flipped ? "is-flipped" : ""}`}
          onClick={() => setFlipped((value) => !value)}
          aria-label={
            flipped
              ? `Show ${workshop.title} photo`
              : `Show ${workshop.title} price and booking details`
          }
          aria-pressed={flipped}
        >
          <span className="editorial-workshop-flip-inner">
            <span className="editorial-workshop-face editorial-workshop-front">
              <img src={workshop.image} alt={workshop.title} />
              <span className="flip-hint">CLICK FOR DETAILS ↗</span>
            </span>

            <span className="editorial-workshop-face editorial-workshop-back">
              <span className="flip-back-label">WORKSHOP DETAILS</span>

              <span className="flip-price">
                <small>FROM</small>
                <span className="flip-price-value">
                  <span className="flip-currency">$</span>
                  <strong>{workshop.price}</strong>
                </span>
                <small>PER PERSON</small>
              </span>

              <span className="flip-title">{workshop.title}</span>

              <span className="flip-session">
                {nextSession
                  ? `${formatShortDate(nextSession.date)} · ${formatTime(nextSession.startTime)}`
                  : "New dates coming soon"}
              </span>

              {workshop.location && (
                <span className="flip-location">{workshop.location}</span>
              )}

              <span className="flip-return">
                <RotateCcw size={14} />
                tap to flip back
              </span>
            </span>
          </span>
        </button>

        <div className="editorial-workshop-copy">
          <div className="editorial-workshop-meta">
            <span>
              {nextSession
                ? `${formatShortDate(nextSession.date)} · ${formatTime(nextSession.startTime)}`
                : "DATES COMING SOON"}
            </span>
            <span>${workshop.price} / PERSON</span>
          </div>

          <h3>{workshop.title}</h3>
          <p>{workshop.description}</p>

          <Link className="editorial-card-link" to={`/book/${workshop.slug}`}>
            Choose a session <ArrowUpRight size={15} />
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="workshop-card">
      <Link className="workshop-image" to={`/workshops/${workshop.slug}`}>
        <img src={workshop.image} alt={workshop.title} />
        <span className="price-pill">${workshop.price} / person</span>
      </Link>

      <div className="workshop-card-body">
        <div className="date-line">
          {nextSession
            ? `${formatShortDate(nextSession.date)} · ${formatTime(nextSession.startTime)}`
            : "New dates coming soon"}
        </div>

        <div className="mini-overline">{workshop.location}</div>

        <h3>{workshop.title}</h3>
        <p>{workshop.description}</p>

        <Link className="brick-button full" to={`/book/${workshop.slug}`}>
          Choose a Session
        </Link>
      </div>
    </article>
  );
}
