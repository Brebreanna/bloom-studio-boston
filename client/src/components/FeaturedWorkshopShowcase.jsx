import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { formatShortDate, formatTime } from "../utils/dates.js";

function FeaturedWorkshopTile({ workshop }) {
  const [flipped, setFlipped] = useState(false);
  const nextSession = workshop.sessions?.[0];

  return (
    <article className="featured-tile">
      <button
        type="button"
        className={`featured-flip ${flipped ? "is-flipped" : ""}`}
        onClick={() => setFlipped((value) => !value)}
        aria-label={
          flipped
            ? `Show ${workshop.title} photo`
            : `Show ${workshop.title} price and details`
        }
      >
        <span className="featured-flip-inner">
          <span className="featured-face featured-front">
            <img src={workshop.image} alt={workshop.title} />
            <span className="featured-flip-hint">CLICK FOR DETAILS</span>
          </span>

          <span className="featured-face featured-back">
            <span className="featured-back-label">WORKSHOP DETAILS</span>

            <span className="featured-price">
              <span className="featured-price-label">FROM</span>
              <span className="featured-price-row">
                <span className="featured-currency">$</span>
                <strong>{workshop.price}</strong>
              </span>
              <span className="featured-price-label">PER PERSON</span>
            </span>

            <span className="featured-back-title">{workshop.title}</span>

            <span className="featured-back-meta">
              {nextSession
                ? `${formatShortDate(nextSession.date)} · ${formatTime(nextSession.startTime)}`
                : "New dates coming soon"}
            </span>

            {workshop.location && (
              <span className="featured-back-meta">{workshop.location}</span>
            )}

            <span className="featured-flip-back">
              <RotateCcw size={13} />
              tap to flip back
            </span>
          </span>
        </span>
      </button>

      <div className="featured-tile-info">
        <div className="featured-tile-meta">
          <span>
            {nextSession
              ? `${formatShortDate(nextSession.date)} · ${formatTime(nextSession.startTime)}`
              : "DATES COMING SOON"}
          </span>
          <span>${workshop.price} / PERSON</span>
        </div>

        <h3>{workshop.title}</h3>
        <p>{workshop.description}</p>

        <Link to={`/book/${workshop.slug}`} className="featured-book-link">
          Choose a session <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}

export default function FeaturedWorkshopShowcase({ workshops = [] }) {
  return (
    <div className="featured-showcase-grid">
      {workshops.slice(0, 3).map((workshop) => (
        <FeaturedWorkshopTile key={workshop.id} workshop={workshop} />
      ))}
    </div>
  );
}
