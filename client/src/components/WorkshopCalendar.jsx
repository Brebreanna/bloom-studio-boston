import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { formatTimeRange, getMonthTitle } from "../utils/dates.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateKey(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function WorkshopCalendar({ workshopSlug = null, compact = false, defaultOpen = false }) {
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [sessions, setSessions] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setLoading(true);

    fetch(`/api/calendar?year=${viewYear}&month=${viewMonth + 1}`)
      .then((r) => r.json())
      .then((rows) => {
        const filtered = workshopSlug
          ? rows.filter((row) => row.slug === workshopSlug)
          : rows;

        setSessions(filtered);

        if (filtered.length) {
          const firstAvailable = filtered[0].date;
          setSelectedDate((current) =>
            current && filtered.some((row) => row.date === current)
              ? current
              : firstAvailable
          );
        } else {
          setSelectedDate(null);
        }
      })
      .finally(() => setLoading(false));
  }, [viewYear, viewMonth, workshopSlug]);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const sessionsByDate = useMemo(() => {
    const map = new Map();

    for (const session of sessions) {
      if (!map.has(session.date)) map.set(session.date, []);
      map.get(session.date).push(session);
    }

    return map;
  }, [sessions]);

  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  const selectedSessions = selectedDate
    ? sessionsByDate.get(selectedDate) || []
    : [];

  const previousMonth = () => {
    const date = new Date(viewYear, viewMonth - 1, 1);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (date < currentMonthStart) return;

    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const nextMonth = () => {
    const date = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
  };

  const isPastMonth =
    viewYear === now.getFullYear() && viewMonth === now.getMonth();

  return (
    <section className={`real-calendar ${compact ? "calendar-compact" : ""}`}>
      <button
        type="button"
        className="calendar-collapse-toggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <div>
          <div className="mini-overline">LIVE WORKSHOP CALENDAR</div>
          <strong>{open ? "Hide calendar" : "Browse by calendar"}</strong>
          <span>{getMonthTitle(viewYear, viewMonth)}</span>
        </div>

        <ChevronDown
          size={20}
          className={open ? "calendar-chevron open" : "calendar-chevron"}
        />
      </button>

      {open && (
        <div className="calendar-collapsible-content">
          <div className="calendar-toolbar">
            <button
              type="button"
              onClick={previousMonth}
              disabled={isPastMonth}
              aria-label="Previous month"
            >
              <ChevronLeft size={18} />
            </button>

            <div>
              <div className="mini-overline">AVAILABLE SESSIONS</div>
              <h2>{getMonthTitle(viewYear, viewMonth)}</h2>
            </div>

            <button type="button" onClick={nextMonth} aria-label="Next month">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="calendar-grid">
            {cells.map((day, index) => {
              if (day === null) {
                return <div className="calendar-empty" key={`empty-${index}`} />;
              }

              const key = dateKey(viewYear, viewMonth, day);
              const daySessions = sessionsByDate.get(key) || [];
              const hasSessions = daySessions.length > 0;

              return (
                <button
                  type="button"
                  key={key}
                  className={[
                    "calendar-day",
                    hasSessions ? "has-sessions" : "",
                    selectedDate === key ? "selected" : "",
                  ].join(" ")}
                  onClick={() => hasSessions && setSelectedDate(key)}
                  disabled={!hasSessions}
                >
                  <span>{day}</span>
                  {hasSessions && <i>{daySessions.length}</i>}
                </button>
              );
            })}
          </div>

          <div className="calendar-session-panel">
            {loading ? (
              <p>Loading available sessions…</p>
            ) : selectedSessions.length ? (
              selectedSessions.map((session) => (
                <Link
                  className="calendar-session"
                  to={`/book/${session.slug}`}
                  key={session.id}
                >
                  <img src={session.image} alt="" />
                  <div>
                    <strong>{session.title}</strong>
                    <span>{formatTimeRange(session)}</span>
                    <small>{session.spotsLeft} seats available · ${session.price}</small>
                  </div>
                  <b>Book →</b>
                </Link>
              ))
            ) : (
              <p className="calendar-empty-message">
                No workshops are scheduled for this month. Try the next month.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
