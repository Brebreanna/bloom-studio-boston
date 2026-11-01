import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { useWorkshop, useWorkshops } from "../components/useWorkshops.js";
import { formatDate, formatTimeRange } from "../utils/dates.js";

export default function WorkshopDetail() {
  const { slug } = useParams();
  const { workshop, loading } = useWorkshop(slug);
  const { workshops } = useWorkshops();
  const [policies, setPolicies] = useState(null);
  useEffect(() => { fetch("/api/policies").then((r) => r.json()).then(setPolicies).catch(() => {}); }, []);

  if (loading || !workshop) {
    return <main className="shell section"><p>Loading workshop…</p></main>;
  }

  const related = workshops.filter((w) => w.id !== workshop.id).slice(0, 2);
  const nextSession = workshop.sessions?.[0];

  return (
    <main>
      <section className="shell detail-grid section">
        <div>
          <div className="gallery-main">
            <img src={workshop.image} alt={workshop.title} />
          </div>

          <div className="gallery-thumbs">
            {workshop.gallery.map((src) => (
              <img key={src} src={src} alt="" />
            ))}
          </div>
        </div>

        <div className="detail-panel">
          <div className="mini-overline">{workshop.location}</div>
          <h1>{workshop.title}</h1>

          <p className="detail-price">
            ${workshop.price} per person · {workshop.duration}
          </p>

          {nextSession && (
            <div className="next-session-banner">
              <span>Next available</span>
              <strong>{formatDate(nextSession.date)}</strong>
              <small>{formatTimeRange(nextSession)}</small>
            </div>
          )}

          <Link className="brick-button full" to={`/book/${workshop.slug}`}>
            View Live Calendar
          </Link>

          <div className="info-block">
            <h3>What You'll Make</h3>
            <p>{workshop.description}</p>
          </div>

          <div className="info-block">
            <h3>What's Provided</h3>
            <p>{workshop.provided}</p>
          </div>

          <div className="info-block">
            <h3>Skill Level</h3>
            <p>{workshop.skill}</p>
          </div>

          <div className="policy-card">
            <h3>Studio Policies</h3>
            <p><strong>Payment:</strong> {policies?.payment || "Full payment is due when booking."}</p>
            <p><strong>Cancellation:</strong> {policies?.cancellationShort || "Cancel 24+ hours ahead for store credit."}</p>
            <p><strong>Location:</strong> {workshop.location}. Your session confirmation will include the final venue details.</p>
          </div>
        </div>
      </section>

      <section className="shell section compact-top">
        <div className="section-heading">
          <h2>More Workshops</h2>
          <Link to="/workshops">View all →</Link>
        </div>

        <div className="related-grid">
          {related.map((w) => (
            <Link key={w.id} to={`/workshops/${w.slug}`} className="related-card">
              <img src={w.image} alt="" />
              <div>
                <h3>{w.title}</h3>
                <span>${w.price}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
