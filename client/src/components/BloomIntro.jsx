import { useEffect, useState } from "react";

export default function BloomIntro() {
  const [visible, setVisible] = useState(true);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setClosing(true);
    }, 2350);

    const removeTimer = window.setTimeout(() => {
      setVisible(false);
    }, 3000);

    return () => {
      window.clearTimeout(closeTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const exit = () => {
    setClosing(true);
    window.setTimeout(() => setVisible(false), 450);
  };

  if (!visible) return null;

  const petals = Array.from({ length: 12 });

  return (
    <div className={`bloom-intro ${closing ? "is-closing" : ""}`}>
      <div className="bloom-intro-orbit" aria-hidden="true">
        <span>MAKE</span>
        <span>GATHER</span>
        <span>BLOOM</span>
      </div>

      <div className="bloom-intro-flower" aria-hidden="true">
        {petals.map((_, index) => (
          <span
            key={index}
            className="bloom-intro-petal"
            style={{
              "--petal-index": index,
              "--petal-angle": `${index * 30}deg`,
            }}
          />
        ))}
        <span className="bloom-intro-center">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </div>

      <div className="bloom-intro-copy">
        <span>WELCOME TO</span>
        <strong>BLOOM</strong>
        <small>CREATIVE STUDIO · BOSTON</small>
      </div>

      <button type="button" className="bloom-intro-skip" onClick={exit}>
        ENTER STUDIO
      </button>
    </div>
  );
}
