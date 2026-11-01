export default function PageIntro({ badge, title, text }) {
  return (
    <section className="shell page-intro">
      {badge && <div className="soft-badge">{badge}</div>}
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}
