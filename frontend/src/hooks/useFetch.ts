"use client";

// A small hook to load data from the API.
//
//   const { data, loading, error, reload } = useFetch<Product[]>("/products");
//
// - loads when the component appears
// - loads again when `url` or `params` change
// - call reload() to load again (e.g. after you saved something)
import { useCallback, useEffect, useState } from "react";
import { apiGet, getErrorMessage } from "@/lib/api";

export function useFetch<T>(url: string | null, params?: object) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // turn params into text so useEffect can compare it
  const paramsKey = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiGet<T>(url, JSON.parse(paramsKey));
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [url, paramsKey]);

  useEffect(() => {
    // loading data when the page opens is a normal reason to set state in an effect
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}
