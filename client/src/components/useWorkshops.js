import { useEffect, useState } from "react";

export function useWorkshops() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/workshops")
      .then((r) => r.json())
      .then(setWorkshops)
      .finally(() => setLoading(false));
  }, []);

  return { workshops, loading };
}

export function useWorkshop(slug) {
  const [workshop, setWorkshop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/workshops/${slug}`)
      .then((r) => r.json())
      .then(setWorkshop)
      .finally(() => setLoading(false));
  }, [slug]);

  return { workshop, loading };
}
