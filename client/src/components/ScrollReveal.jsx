import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const items = document.querySelectorAll(
      ".editorial-section-head, .editorial-workshop-card, .editorial-next-title, .editorial-session-row, .editorial-story-copy, .editorial-story-images, .events-image-wrap, .events-copy, .event-alert-card, .product-card, .workshop-card, .waitlist-card"
    );

    items.forEach((item) => item.classList.add("reveal-on-scroll"));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -30px 0px" }
    );

    items.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return null;
}
