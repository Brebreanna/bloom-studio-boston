import { useState } from "react";
import { ChevronDown } from "lucide-react";

export default function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "open" : ""}`}>
      <button onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <ChevronDown size={17} />
      </button>
      {open && <p>{answer}</p>}
    </div>
  );
}
