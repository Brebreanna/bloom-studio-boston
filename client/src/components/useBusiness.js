import { useEffect, useState } from "react";

export function useBusiness() {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/business")
      .then((r) => r.json())
      .then(setBusiness)
      .finally(() => setLoading(false));
  }, []);

  return { business, loading };
}
