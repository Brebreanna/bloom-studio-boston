import { useMemo, useState } from "react";
import PageIntro from "../components/PageIntro.jsx";
import WorkshopCard from "../components/WorkshopCard.jsx";
import WorkshopCalendar from "../components/WorkshopCalendar.jsx";
import Footer from "../components/Footer.jsx";
import ComingSoonWaitlist from "../components/ComingSoonWaitlist.jsx";
import EventNotificationsSignup from "../components/EventNotificationsSignup.jsx";
import { useWorkshops } from "../components/useWorkshops.js";

export default function Workshops() {
  const { workshops, loading } = useWorkshops();
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Candle", "Craft", "Seasonal"];

  const visible = useMemo(() => {
    if (filter === "All") return workshops;
    return workshops.filter((workshop) => workshop.category === filter);
  }, [workshops, filter]);

  return (
    <main>
      <PageIntro
        badge="LIVE WORKSHOP CALENDAR"
        title="Workshops & Gatherings"
        text="Browse upcoming classes by date. The calendar always opens to the current month and only shows future workshop sessions."
      />

      <section className="shell calendar-section">
        <WorkshopCalendar defaultOpen={false} />
      </section>

      <div className="shell filter-tabs section compact-bottom">
        {filters.map((item) => (
          <button
            className={filter === item ? "active" : ""}
            onClick={() => setFilter(item)}
            key={item}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="shell section compact-top">
        {loading ? (
          <p>Loading workshops…</p>
        ) : (
          <div className="workshop-grid">
            {visible.map((workshop) => (
              <WorkshopCard key={workshop.id} workshop={workshop} />
            ))}
          </div>
        )}
      </section>

      <section className="shell section compact-top"><ComingSoonWaitlist /></section>

      <section className="shell section compact-top"><EventNotificationsSignup /></section>

      <Footer />
    </main>
  );
}
