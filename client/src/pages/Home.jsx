import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Footer from "../components/Footer.jsx";
import FeaturedWorkshopShowcase from "../components/FeaturedWorkshopShowcase.jsx";
import { useWorkshops } from "../components/useWorkshops.js";
import EventNotificationsSignup from "../components/EventNotificationsSignup.jsx";
import { formatShortDate, formatTime } from "../utils/dates.js";

export default function Home() {
  const { workshops } = useWorkshops();
  const [mood, setMood] = useState("slow");
  const moods = {
    slow: { heading: "A little time for yourself.", detail: "Soft music, busy hands, and something lovely to take home.", label: "SLOW AFTERNOON", link: "/workshops", cta: "Find your workshop" },
    together: { heading: "Better when we're together.", detail: "Bring your people. Make a memory that doesn't live on a screen.", label: "WITH MY PEOPLE", link: "/private-events", cta: "Plan a gathering" },
    gift: { heading: "Made with love. Given with love.", detail: "Find a little piece of Bloom to brighten someone's day.", label: "SOMETHING TO GIFT", link: "/shop", cta: "Explore the shop" }
  };

  const featured = workshops
    .filter((workshop) => workshop.featured)
    .slice(0, 3);

  const nextSessions = workshops
    .flatMap((workshop) =>
      (workshop.sessions || []).map((session) => ({
        ...session,
        slug: workshop.slug,
        title: workshop.title,
        image: workshop.image,
        price: workshop.price,
      }))
    )
    .sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt))
    .slice(0, 4);

  return (
    <main className="editorial-home">
      <section className="editorial-hero">
        <div className="editorial-wordmark" aria-hidden="true">
          BLOOM
        </div>

        <div className="shell editorial-hero-grid">
          <div className="editorial-hero-copy">
            <div className="eyebrow-row">
              <span>BOSTON · CREATIVE STUDIO</span>
              <span>WORKSHOPS / EVENTS / OBJECTS</span>
            </div>

            <h1>
              Make something
              <em> beautiful.</em>
            </h1>

            <p>
              A playful creative studio for candle making, decorated objects,
              intimate gatherings, and the kind of afternoons you want to remember.
            </p>

            <div className="editorial-hero-actions">
              <Link className="editorial-primary" to="/workshops">
                Explore Workshops <ArrowUpRight size={16} />
              </Link>
              <Link className="editorial-secondary" to="/private-events">
                Private Events
              </Link>
            </div>
          </div>

          <div className="editorial-collage">
            <figure className="collage-main">
              <img src="/images/shop-gown-candle-trio.png" alt="Pastel sculptural gown candles" />
            </figure>

            <figure className="collage-float collage-float-one">
              <img src="/images/shop-mask-collection.jpeg" alt="Decorative Bloom Studio masks" />
            </figure>

            <figure className="collage-float collage-float-two">
              <img src="/images/shop-floral-glass-candles.png" alt="Floral glass candles" />
            </figure>

            
            <span className="collage-note">MAKE · GATHER · BLOOM</span>

            <span
              className="garden-sticker garden-sticker-flower"
              data-garden-sticker
              data-rotate="-12"
              aria-hidden="true"
            >
              ❀
            </span>

            <span
              className="garden-sticker garden-sticker-leaf"
              data-garden-sticker
              data-rotate="9"
              aria-hidden="true"
            >
              ☘
            </span>

          </div>
        </div>

        <div className="hero-marquee" aria-hidden="true">
          <span>WORKSHOPS ✦ PRIVATE EVENTS ✦ READY-MADE ART ✦ CANDLES ✦ COMMUNITY ✦</span>
          <span>WORKSHOPS ✦ PRIVATE EVENTS ✦ READY-MADE ART ✦ CANDLES ✦ COMMUNITY ✦</span>
        </div>
      </section>

      <section className="bloom-mood-section shell" aria-labelledby="bloom-mood-title">
        <div className="bloom-mood-intro">
          <span className="bloom-mood-kicker">A LITTLE BLOOM RITUAL ✳</span>
          <h2 id="bloom-mood-title">What are you in the mood to <em>make?</em></h2>
          <p>There's no right way to be creative. Pick a feeling and we'll point you somewhere lovely.</p>
        </div>
        <div className="bloom-mood-board">
          <div className="bloom-mood-tabs" role="group" aria-label="Choose your creative mood">
            <button type="button" className={mood === "slow" ? "is-active" : ""} aria-pressed={mood === "slow"} onClick={() => setMood("slow")}><span aria-hidden="true">✿</span> A slow afternoon</button>
            <button type="button" className={mood === "together" ? "is-active" : ""} aria-pressed={mood === "together"} onClick={() => setMood("together")}><span aria-hidden="true">♡</span> Time together</button>
            <button type="button" className={mood === "gift" ? "is-active" : ""} aria-pressed={mood === "gift"} onClick={() => setMood("gift")}><span aria-hidden="true">✧</span> A little gift</button>
          </div>
          <div className="bloom-mood-result" key={mood}>
            <span className="bloom-mood-label">{moods[mood].label}</span>
            <h3>{moods[mood].heading}</h3>
            <p>{moods[mood].detail}</p>
            <Link to={moods[mood].link}>{moods[mood].cta} <ArrowUpRight size={17}/></Link>
            <span className="bloom-mood-flower" aria-hidden="true">✿</span>
          </div>
        </div>
      </section>

      <section className="shell editorial-featured section">
        <div className="editorial-section-head">
          <div>
            <span>CURRENTLY AT BLOOM</span>
            <h2>Choose your next creative obsession.</h2>
          </div>
          <Link to="/workshops">See all workshops <ArrowUpRight size={15} /></Link>
        </div>

        <FeaturedWorkshopShowcase workshops={featured} />
      </section>


      <section className="shell bloom-mood section">
        <div className="bloom-mood-copy">
          <span>PLAY WITH BLOOM</span>
          <h2>What are you in the mood to make?</h2>
        </div>

        <div className="bloom-mood-grid">
          <Link className="mood-card mood-card-pink" to="/workshops">
            <strong>Something romantic</strong>
            <span>Candles · florals · sculptural pieces</span>
            <em>♡</em>
          </Link>

          <Link className="mood-card mood-card-cream" to="/workshops">
            <strong>Something playful</strong>
            <span>Decorated objects · charms · colorful experiments</span>
            <em>✦</em>
          </Link>

          <Link className="mood-card mood-card-rose" to="/private-events">
            <strong>Something together</strong>
            <span>Birthdays · besties · private creative nights</span>
            <em>❀</em>
          </Link>
        </div>
      </section>

      <section className="editorial-next">
        <div className="shell editorial-next-grid">
          <div className="editorial-next-title">
            <span>NEXT UP</span>
            <h2>Pick a date.<br />We’ll handle the rest.</h2>
            <Link to="/workshops">
              Open the full calendar <ArrowDownRight size={16} />
            </Link>
          </div>

          <div className="editorial-session-list">
            {nextSessions.length ? nextSessions.map((session, index) => (
              <Link
                className="editorial-session-row"
                key={session.id}
                to={`/book/${session.slug}`}
              >
                <span className="session-date">
                  {formatShortDate(session.date)}
                  <small>{formatTime(session.startTime)}</small>
                </span>
                <strong>{session.title}</strong>
                <span className="session-price">${session.price}</span>
                <ArrowUpRight size={18} />
              </Link>
            )) : (
              <p>New workshop dates will appear here automatically.</p>
            )}
          </div>
        </div>
      </section>

      <div className="home-lower-flow">
<section className="shell editorial-story section">
        <div className="editorial-story-copy">
          <span>THE STUDIO SHOP</span>
          <h2>
            The experiments are
            <em> part of the art.</em>
          </h2>
          <p>
            Vicky’s test runs, one-off color studies, and finished samples become
            small-batch pieces you can take home — no workshop required.
          </p>
          <Link className="editorial-primary" to="/shop">
            Shop Studio Originals <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="editorial-story-images">
          <img className="story-image-one" src="/images/shop-daisy-bouquet.png" alt="Daisy candle bouquet" />
          <img className="story-image-two" src="/images/shop-blue-gown-gift.png" alt="Blue gown candle gift set" />
        </div>
      </section>

      <section className="editorial-events">
        <div className="shell editorial-events-grid">
          <div className="events-image-wrap">
            <img src="/images/people-candle-workshop.png" alt="Bloom Studio workshop gathering" />
            <span>YOUR PEOPLE + SOMETHING BEAUTIFUL TO MAKE</span>
          </div>

          <div className="events-copy">
            <span>PRIVATE GATHERINGS</span>
            <h2>Not every celebration needs a dance floor.</h2>
            <p>
              Birthdays, bachelorettes, team nights, and intimate celebrations —
              designed around making something together.
            </p>
            <Link to="/private-events">
              Plan a private event <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="shell editorial-alerts section">
        <div className="editorial-alert-heading">
          <span>STAY IN THE LOOP</span>
          <h2>New workshop? You’ll know first.</h2>
        </div>
        <EventNotificationsSignup compact />
      </section>


      <section className="shell bloom-secret-note">
        <button
          type="button"
          onClick={(event) => {
            const note = event.currentTarget.querySelector("span");
            note.textContent =
              note.textContent === "tap me"
                ? "you found a little bloom ✿"
                : "tap me";
          }}
        >
          <em>✿</em>
          <span>tap me</span>
        </button>
      </section>
</div>

      <Footer />
    </main>
  );
}
