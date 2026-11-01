import { useEffect, useRef, useState } from "react";

let sdkPromise;

function loadSquareSdk(url) {
  if (window.Square) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-bloom-square-sdk="${url}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Square payment form could not load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.bloomSquareSdk = url;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Square payment form could not load."));
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export default function SquareCardForm({ amount, onPay, disabled = false }) {
  const cardRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  useEffect(() => {
    let cancelled = false;
    let card;

    async function setup() {
      try {
        setError("");
        const response = await fetch("/api/payments/config");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Square is not configured.");

        await loadSquareSdk(payload.sdkUrl);
        if (cancelled) return;
        if (!window.Square) throw new Error("Square payment SDK did not initialize.");

        const payments = window.Square.payments(payload.applicationId, payload.locationId);
        card = await payments.card();
        await card.attach("#square-card-container");

        if (!cancelled) {
          cardRef.current = card;
          setConfig(payload);
          setReady(true);
        }
      } catch (setupError) {
        if (!cancelled) setError(setupError.message);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (card) card.destroy().catch(() => {});
      cardRef.current = null;
    };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!cardRef.current || processing || disabled) return;

    if (!customerEmail.trim() || !customerEmail.includes("@")) {
      setError("Enter an email address for your confirmation.");
      return;
    }

    setProcessing(true);
    setError("");

    try {
      const parts = customerName.trim().split(/\s+/).filter(Boolean);
      const verificationDetails = {
        amount: Number(amount || 0).toFixed(2),
        currencyCode: "USD",
        intent: "CHARGE",
        customerInitiated: true,
        sellerKeyedIn: false,
        billingContact: {
          givenName: parts[0] || "Bloom",
          familyName: parts.slice(1).join(" ") || "Guest",
          email: customerEmail.trim(),
          countryCode: "US",
        },
      };

      const tokenResult = await cardRef.current.tokenize(verificationDetails);
      if (tokenResult.status !== "OK" || !tokenResult.token) {
        const detail = tokenResult.errors?.map((item) => item.message || item.detail).filter(Boolean).join(" ");
        throw new Error(detail || "Please check the card information and try again.");
      }

      await onPay({
        sourceId: tokenResult.token,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
      });
    } catch (paymentError) {
      setError(paymentError.message);
      setProcessing(false);
    }
  };

  return (
    <form className="square-checkout" onSubmit={submit}>
      <div className="square-checkout-heading">
        <span>SECURE CHECKOUT</span>
        <strong>Square</strong>
      </div>

      <label className="square-field">
        Name
        <input
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </label>

      <label className="square-field">
        Email
        <input
          type="email"
          required
          value={customerEmail}
          onChange={(event) => setCustomerEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>

      <div className="square-card-label">Card details</div>
      <div id="square-card-container" className="square-card-container" />

      {error && <p className="square-payment-error" role="alert">{error}</p>}

      <button className="brick-button full square-pay-button" type="submit" disabled={!ready || processing || disabled}>
        {processing ? "Processing…" : ready ? `Pay $${Number(amount || 0).toFixed(2)}` : "Loading secure checkout…"}
      </button>
    </form>
  );
}
