import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, ShoppingBag, UserRound } from "lucide-react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const links = [
  ["/workshops", "Workshops"],
  ["/shop", "Shop"],
  ["/about", "About"],
  ["/private-events", "Private Events"],
  ["/membership", "Membership"],
  ["/faq", "FAQ"]
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cart } = useCart();
  const { user } = useAuth();

  return (
    <>
      <div className="announcement">BLOOM STUDIO BOSTON · CREATIVE WORKSHOPS · PRIVATE EVENTS · STUDIO SHOP</div>
      <header className="site-header">
        <div className="shell header-grid">
          <button className="mobile-menu" type="button" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Menu size={20} /></button>

          <Link className="brand" to="/" aria-label="Bloom Studio Boston home">
            <span className="brand-logo-stage">
              <img src="/images/bloom-logo.png" alt="Bloom Studio Boston" />
              <span className="logo-bloom-dot" aria-hidden="true" />
              <span className="logo-bloom-dot" aria-hidden="true" />
              <span className="logo-bloom-dot" aria-hidden="true" />
              <span className="logo-bloom-dot" aria-hidden="true" />
              <span className="logo-bloom-dot" aria-hidden="true" />
              <span className="logo-bloom-dot" aria-hidden="true" />
            </span>
          </Link>

          <nav className="desktop-nav">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <Link className="desktop-book" to="/workshops">Book</Link>
            <Link
              className="account-button"
              to="/account"
              aria-label={user ? `Account for ${user.name}` : "Sign in"}
              title={user ? `Hi, ${user.name}` : "Sign in"}
            >
              <UserRound size={18} />
            </Link>

            <Link className="cart-button" to="/cart" aria-label={`Cart with ${cart.count} items`}>
              <ShoppingBag size={18} />
              {cart.count > 0 && <span>{cart.count}</span>}
            </Link>
          </div>
        </div>
      </header>
      {menuOpen && <nav className="mobile-drawer" aria-label="Mobile menu">
        {links.map(([to, label]) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}>{label}</NavLink>)}
        <NavLink to="/account" onClick={() => setMenuOpen(false)}>Account</NavLink>
        <NavLink to="/cart" onClick={() => setMenuOpen(false)}>Cart</NavLink>
      </nav>}
    </>
  );
}
