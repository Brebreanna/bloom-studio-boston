import { useEffect, useMemo, useState } from "react";
import Footer from "../components/Footer.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Shop() {
  const { addProduct } = useCart();
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [addingId, setAddingId] = useState(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/products");
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error || `Shop API returned ${response.status}.`);
        }

        if (!Array.isArray(data)) {
          throw new Error("The shop API returned an unexpected response.");
        }

        if (!cancelled) {
          setProducts(data);
        }
      } catch (error) {
        console.error("Could not load Bloom Studio products:", error);
        if (!cancelled) {
          setProducts([]);
          setLoadError(
            error.message ||
              "The shop could not connect to the product database."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(products.map((product) => product.category))],
    [products]
  );

  const visible = useMemo(
    () => filter === "All"
      ? products
      : products.filter((product) => product.category === filter),
    [products, filter]
  );

  const add = async (product) => {
    setAddingId(product.id);
    setStatus("");

    try {
      await addProduct({ productId: product.id, quantity: 1 });
      setStatus(`${product.title} was added to your cart.`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <main>
      <section className="shell shop-hero section">
        <div>
          <div className="mini-overline">THE BLOOM STUDIO SHOP</div>
          <h1>Made at Bloom, ready to take home.</h1>
          <p>
            Shop finished pieces from studio test runs, sample making, and small
            creative batches. Quantities are intentionally limited because many
            pieces are one-of-one.
          </p>
        </div>

        <img
          src="/images/shop-gown-candle-trio.png"
          alt="Finished Bloom Studio pastel gown candles"
        />
      </section>

      <section className="shell shop-section section compact-top">
        <div className="shop-toolbar">
          <div>
            <div className="mini-overline">READY-MADE PIECES</div>
            <h2>Studio Originals</h2>
          </div>

          <div className="shop-filter-tabs">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={filter === category ? "active" : ""}
                onClick={() => setFilter(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {status && <p className="shop-status" role="status">{status}</p>}

        {loading && (
          <div className="shop-load-state" role="status">
            <div className="mini-overline">LOADING THE STUDIO SHELF</div>
            <h3>Gathering the latest pieces…</h3>
          </div>
        )}

        {!loading && loadError && (
          <div className="shop-load-state shop-load-error" role="alert">
            <div className="mini-overline">SHOP CONNECTION</div>
            <h3>We couldn't load the shop right now.</h3>
            <p>Please refresh the page or try again in a moment.</p>
          </div>
        )}

        {!loading && !loadError && products.length === 0 && (
          <div className="shop-load-state">
            <div className="mini-overline">STUDIO ORIGINALS</div>
            <h3>The studio shelf is being refreshed.</h3>
            <p>Check back soon for available ready-made pieces.</p>
          </div>
        )}

        {!loading && !loadError && (
        <div className="product-grid">
          {visible.map((product) => (
            <article className="product-card" key={product.id}>
              <div className="product-image">
                <img src={product.image} alt={product.title} />
                <span>{product.badge}</span>
              </div>

              <div className="product-body">
                <div className="product-meta">
                  <span>{product.category}</span>
                  <strong>${product.price}</strong>
                </div>

                <h3>{product.title}</h3>
                <p>{product.description}</p>

                <div className="product-bottom">
                  <small>
                    {product.stock === 1
                      ? "Only 1 available"
                      : `${product.stock} available`}
                  </small>

                  <button
                    type="button"
                    className="brick-button"
                    onClick={() => add(product)}
                    disabled={addingId === product.id || product.stock <= 0}
                  >
                    {addingId === product.id ? "Adding…" : "Add to Cart"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        )}
      </section>

      <section className="shell shop-policy-note">
        <div><div className="mini-overline">SHOP POLICY</div><h2>Made in small batches, final sale.</h2></div>
        <p>Ready-made artwork and studio pieces are non-refundable. Massachusetts sales tax is calculated at checkout on taxable shop purchases.</p>
      </section>

      <section className="shell shop-note">
        <div>
          <div className="mini-overline">WHY THE SHOP?</div>
          <h2>Beautiful experiments deserve a home too.</h2>
        </div>
        <p>
          Vicky creates finished samples while testing new workshops, colors,
          molds, and techniques. The shop gives those pieces a second life
          instead of leaving them on the studio shelf.
        </p>
      </section>

      <Footer />
    </main>
  );
}
