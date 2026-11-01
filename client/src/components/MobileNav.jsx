import { Home, CalendarDays, Store, Sparkles, ShoppingBag } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function MobileNav() {
  const { cart } = useCart();
  const items = [
    ["/", Home, "Home"],
    ["/workshops", CalendarDays, "Workshops"],
    ["/shop", Store, "Shop"],
    ["/private-events", Sparkles, "Events"],
    ["/cart", ShoppingBag, cart.count ? `Cart ${cart.count}` : "Cart"]
  ];

  return (
    <nav className="mobile-nav">
      {items.map(([to, Icon, label]) => (
        <NavLink key={to} to={to} end={to === "/"}>
          <Icon size={18} strokeWidth={1.55} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
