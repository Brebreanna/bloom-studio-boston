import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import { useCart } from "../context/CartContext.jsx";
import { formatDate, formatTimeRange } from "../utils/dates.js";
import SquareCardForm from "../components/SquareCardForm.jsx";

export default function Cart() {
  const { cart, loading, updateQuantity, removeItem, clearCart, checkout, priceCart } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [priced, setPriced] = useState(null);
  const [status, setStatus] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const refreshPricing = async (code = promoCode) => {
    try { const next = await priceCart(code); setPriced(next); setStatus(next.promoRejected || (next.promo ? `${next.promo.code} applied.` : "")); }
    catch (error) { setStatus(error.message); }
  };
  useEffect(() => { if (!loading && cart.id) refreshPricing(""); }, [loading, cart.id, cart.count, cart.subtotal]);

  const summary = priced || cart;
  const doCheckout = async (paymentDetails) => {
    const result = await checkout({ promoCode, ...paymentDetails });
    setConfirmation(result);
    return result;
  };

  return <main>
    <section className="shell section cart-page">
      <div className="page-title-row"><div><div className="mini-overline">YOUR BLOOM BAG</div><h1>Cart</h1></div>{cart.items.length > 0 && <button className="text-button" onClick={clearCart}>Clear cart</button>}</div>
      {confirmation ? <div className="payment-confirmation"><span className="mini-overline">PAYMENT COMPLETE</span><h2>Your Bloom order is confirmed.</h2><p>Your payment was completed successfully.</p><strong>Order #{confirmation.orderId}</strong><div><Link className="brick-button" to="/workshops">Keep exploring Bloom</Link></div></div> : loading ? <p>Loading cart…</p> : cart.items.length === 0 ? <div className="empty-cart"><img src="/images/bloom-logo.png" alt="" /><h2>Your Bloom bag is empty.</h2><p>Reserve a workshop or bring home a finished studio piece.</p><div className="empty-cart-actions"><Link className="brick-button" to="/workshops">Browse Workshops</Link><Link className="outline-button" to="/shop">Shop Ready-Made Art</Link></div></div> :
      <div className="cart-layout">
        <div className="cart-items">{cart.items.map((item) => <article className="cart-item" key={item.id}><img src={item.image} alt={item.title}/><div className="cart-item-info"><div className="cart-type">{item.itemType === "product" ? "STUDIO SHOP" : "WORKSHOP"}</div><h3>{item.title}</h3>{item.itemType === "workshop" ? <><p>{formatDate(item.session.date)} · {formatTimeRange(item.session)}</p><span>${item.unitPrice} / guest</span></> : <><p>Ready-made Bloom Studio piece · final sale</p><span>${item.unitPrice} each</span></>}<div className="cart-item-actions"><div className="counter"><button onClick={() => updateQuantity(item.id,item.quantity-1)}>−</button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id,item.quantity+1)}>+</button></div><button className="remove-button" onClick={() => removeItem(item.id)}>Remove</button></div></div><strong className="line-total">${item.lineTotal.toFixed(2)}</strong></article>)}</div>
        <aside className="order-summary">
          <div className="mini-overline">ORDER SUMMARY</div><h2>Your Bloom Bag</h2>
          <div className="promo-box"><label>Promo code<input value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="BLOOM10" /></label><button className="outline-button" onClick={() => refreshPricing(promoCode)}>Apply</button>{status && <small>{status}</small>}</div>
          {summary.membership && <div className="member-discount-note"><strong>{summary.membership.planName} member pricing</strong><span>{summary.membership.discountPercent}% eligible discount automatically considered.</span></div>}
          <div><span>Subtotal</span><span>${Number(summary.subtotal || 0).toFixed(2)}</span></div>
          {Number(summary.discount || 0) > 0 && <div><span>Discount</span><span>−${Number(summary.discount).toFixed(2)}</span></div>}
          <div><span>Estimated tax</span><span>${Number(summary.tax || 0).toFixed(2)}</span></div>
          <div className="summary-total"><span>Total</span><strong>${Number(summary.total ?? summary.subtotal ?? 0).toFixed(2)}</strong></div>
          <SquareCardForm amount={Number(summary.total ?? summary.subtotal ?? 0)} onPay={doCheckout} />
          <p>Workshops are paid in full at booking unless an active member reserves with a credit. Shop artwork is final sale. Payments are securely tokenized by Square.</p>
        </aside>
      </div>}
    </section><Footer />
  </main>;
}
