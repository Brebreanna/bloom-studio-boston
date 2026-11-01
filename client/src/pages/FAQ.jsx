import { useEffect, useState } from "react";
import Footer from "../components/Footer.jsx";
import FAQItem from "../components/FAQItem.jsx";
import PageIntro from "../components/PageIntro.jsx";

export default function FAQ() {
  const [policies, setPolicies] = useState(null);
  useEffect(() => { fetch("/api/policies").then((r) => r.json()).then(setPolicies); }, []);
  const faqs = [
    ["I have zero craft experience. Can I really do this?", "Absolutely. Every Bloom Studio class is designed to be beginner-friendly, with demonstrations and help throughout the session."],
    ["Can I come by myself?", "Yes. Many guests come solo, and the studio is intentionally designed to feel welcoming and social."],
    ["What is included with my ticket?", "Your project materials, shared tools, instruction, and the studio experience are included. Food and drink are not included unless a specific event says otherwise."],
    ["How does payment work?", policies?.payment || "Public workshops are paid in full when booking."],
    ["What is your cancellation and reschedule policy?", policies ? [policies.cancellationShort, ...(policies.cancellationDetails || [])].join(" ") : "Loading policy…"],
    ["Can I use discount codes or membership savings?", policies?.promotions || "Eligible promotions are shown in the cart."],
    ["Are shop purchases refundable?", policies?.shopReturns || "Ready-made artwork is final sale."],
    ["What if a workshop is sold out?", "If a date is full, choose another live session or join a coming-soon interest list when one is available."],
  ];
  return <main>
    <PageIntro badge="HELPFUL DETAILS" title="Frequently Asked Questions" text="Everything you need to know before joining a workshop, shopping Bloom pieces, or planning a private event." />
    <section className="shell faq-grid section compact-top">
      <div className="faq-list">{faqs.map(([q,a]) => <FAQItem key={q} question={q} answer={a} />)}</div>
      <aside className="faq-aside"><img src="/images/mask-making-workshop.png" alt="" /><div><div className="mini-overline">PERSONAL ASSISTANCE</div><h2>Need more help?</h2><p>Have a private group idea or scheduling need? Reach out through the private-events form.</p></div></aside>
    </section>
    <Footer />
  </main>;
}
