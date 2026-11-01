import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { TOKEN_KEY } from "./AuthContext.jsx";

const CartContext = createContext(null);
const CART_KEY = "bloom_cart_id";

async function api(url, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }
  return response.json();
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], count: 0, subtotal: 0 });
  const [loading, setLoading] = useState(true);

  const ensureCart = useCallback(async () => {
    let cartId = localStorage.getItem(CART_KEY);

    if (cartId) {
      try {
        const existing = await api(`/api/carts/${cartId}`);
        setCart(existing);
        return existing.id;
      } catch {
        localStorage.removeItem(CART_KEY);
      }
    }

    const created = await api("/api/carts", { method: "POST" });
    localStorage.setItem(CART_KEY, created.id);
    setCart(created);
    return created.id;
  }, []);

  useEffect(() => {
    ensureCart().finally(() => setLoading(false));
  }, [ensureCart]);

  const addItem = useCallback(async ({ workshopId, sessionId, quantity = 1 }) => {
    const cartId = localStorage.getItem(CART_KEY) || await ensureCart();
    const updated = await api(`/api/carts/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ workshopId, sessionId, quantity }),
    });
    setCart(updated);
    return updated;
  }, [ensureCart]);

  const addProduct = useCallback(async ({ productId, quantity = 1 }) => {
    const cartId = localStorage.getItem(CART_KEY) || await ensureCart();
    const updated = await api(`/api/carts/${cartId}/items`, {
      method: "POST",
      body: JSON.stringify({ itemType: "product", productId, quantity }),
    });
    setCart(updated);
    return updated;
  }, [ensureCart]);

  const updateQuantity = useCallback(async (itemId, quantity) => {
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) return;
    const updated = await api(`/api/carts/${cartId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ quantity }),
    });
    setCart(updated);
  }, []);

  const removeItem = useCallback(async (itemId) => {
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) return;
    const updated = await api(`/api/carts/${cartId}/items/${itemId}`, {
      method: "DELETE",
    });
    setCart(updated);
  }, []);

  const clearCart = useCallback(async () => {
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) return;
    const updated = await api(`/api/carts/${cartId}`, { method: "DELETE" });
    setCart(updated);
  }, []);

  const checkout = useCallback(async ({ promoCode = "", sourceId, customerName = "", customerEmail = "" }) => {
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) throw new Error("Cart not ready");
    const result = await api(`/api/carts/${cartId}/checkout`, {
      method: "POST",
      body: JSON.stringify({ promoCode, sourceId, customerName, customerEmail }),
    });
    if (result.ok) {
      localStorage.removeItem(CART_KEY);
      setCart({ items: [], count: 0, subtotal: 0, discount: 0, tax: 0, total: 0 });
    }
    return result;
  }, []);

  const priceCart = useCallback(async (promoCode = "") => {
    const cartId = localStorage.getItem(CART_KEY);
    if (!cartId) return cart;
    const priced = await api(`/api/carts/${cartId}/pricing?promoCode=${encodeURIComponent(promoCode)}`);
    return priced;
  }, [cart]);

  const value = useMemo(() => ({
    cart,
    loading,
    addItem,
    addProduct,
    updateQuantity,
    removeItem,
    clearCart,
    checkout,
    priceCart
  }), [cart, loading, addItem, addProduct, updateQuantity, removeItem, clearCart, checkout, priceCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
