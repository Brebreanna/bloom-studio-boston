import { MapPin } from "lucide-react";
import { useBusiness } from "./useBusiness.js";

export default function StudioMap() {
  const { business, loading } = useBusiness();

  if (loading || !business) {
    return <div className="map-loading">Loading Bloom Studio details…</div>;
  }

  const query = encodeURIComponent(business.mapQuery || business.address || business.name);
  const embedUrl = `https://www.google.com/maps?q=${query}&output=embed`;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

  return (
    <section className="studio-location-card">
      <div className="studio-map-frame">
        <iframe
          title={`${business.name} map`}
          src={embedUrl}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="studio-map-info">
        <div className="map-title">
          <MapPin size={18} />
          <div>
            <strong>Business / contact address</strong>
            <span>{business.address}</span>
            {business.locationNote && <small>{business.locationNote}</small>}
          </div>
        </div>

        <div className="studio-details">
          {business.email && <a href={`mailto:${business.email}`}>{business.email}</a>}
          <a href={business.instagramUrl || "https://www.instagram.com/bloomstudioboston/"} target="_blank" rel="noreferrer">{business.instagram}</a>
          {business.hours?.map((row) => (
            <span key={row.label}>
              <b>{row.label}:</b> {row.value}
            </span>
          ))}
        </div>

        <a
          className="outline-button full"
          href={directionsUrl}
          target="_blank"
          rel="noreferrer"
        >
          View Address
        </a>
      </div>
    </section>
  );
}
