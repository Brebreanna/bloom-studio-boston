import Footer from "../components/Footer.jsx";
import PageIntro from "../components/PageIntro.jsx";
import { useBusiness } from "../components/useBusiness.js";

export default function About() {
  const { business } = useBusiness();
  const owner = business?.owner;

  return (
    <main>
      <PageIntro
        badge="OUR STORY & MISSION"
        title="A Space to Unwind, Make, and Belong."
        text="Bloom Studio Boston is a woman-owned creative studio built around hands-on making, welcoming energy, and community."
      />

      <section className="shell about-grid section compact-top">
        <img
          src="/images/vicky-about-final.png"
          className="rounded-photo"
          alt="Vicky, founder of Bloom Studio, arranging handmade art pieces in her studio"
        />

        <div className="about-copy">
          <div className="mini-overline">{owner?.title || "FOUNDER & CREATIVE HOST"}</div>
          <h2>Meet {owner?.name || "Vicky"} & The Bloom Story</h2>

          <p>
            {owner?.story ||
              "Vicky started Bloom Studio Boston from a love of arts, crafts, and creating spaces where people can feel welcome."}
          </p>

          <div className="owner-callout">
            <strong>Woman-owned · Boston-based · Community-centered</strong>
            <span>
              {owner?.shortStory ||
                "Built from a love of creativity and bringing people together."}
            </span>
          </div>

          <div className="pillars">
            <div>
              <b>♡</b>
              <h3>Zero Experience Needed</h3>
              <p>No perfectionism. Gentle guidance for first-timers.</p>
            </div>

            <div>
              <b>☕</b>
              <h3>Mindful Leisure</h3>
              <p>Slow down, make something with your hands, and enjoy the process.</p>
            </div>

            <div>
              <b>✦</b>
              <h3>Community First</h3>
              <p>
                Come alone or with friends. Bloom is designed to help people create,
                talk, laugh, and leave feeling connected.
              </p>
            </div>
          </div>
        </div>
      </section>
<Footer />
    </main>
  );
}
