"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { StableMapDocument } from "@/types/stable-map";
import StableMap from "./StableMap";
import styles from "./StableDisplay.module.css";

type Props = { initialMap: StableMapDocument; initialPublishedAt: string | null };

export default function StableDisplay({ initialMap, initialPublishedAt }: Props) {
  const [map, setMap] = useState(initialMap);
  const [publishedAt, setPublishedAt] = useState(initialPublishedAt);
  const [offline, setOffline] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/display/stable-map", { cache: "no-store" });
      if (!response.ok) throw new Error("Map refresh failed");
      const result = await response.json();
      setMap(result.map);
      setPublishedAt(result.publishedAt);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("stable-map-display")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "stable_maps", filter: "id=eq.main" },
        () => void refresh(),
      )
      .subscribe();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return (
    <main className={styles.screen}>
      <StableMap map={map} className={styles.map} />
      {offline ? <div className={styles.offline}>Ühendus katkes – kuvatakse viimast teadaolevat kaarti</div> : null}
      <div className={styles.stamp}>{publishedAt ? `Uuendatud ${new Date(publishedAt).toLocaleString("et-EE", { dateStyle: "short", timeStyle: "short" })}` : "Avaldamist ootav kopliplaan"}</div>
    </main>
  );
}
