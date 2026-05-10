import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryConstraint,
} from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { useAppStore } from "../stores/appStore";
import type { RideDoc } from "../lib/types";
import { RideCard } from "../components/RideCard";
import { SkeletonList } from "../components/SkeletonList";
import { CitySelect } from "../components/CitySelect";
import type { CityKey } from "../lib/cities";

export function HomePage() {
  const { t } = useTranslation();
  const { homeTab, setHomeTab, filterFrom, filterTo, setFilterFrom, setFilterTo } =
    useAppStore();
  const [rows, setRows] = useState<{ id: string; ride: RideDoc }[]>([]);
  const [loading, setLoading] = useState(true);
  const [chooserOpen, setChooserOpen] = useState(false);

  const q = useMemo(() => {
    const db = getDb();
    const type = homeTab === "drivers" ? "driver" : "passenger";
    const parts: QueryConstraint[] = [
      where("type", "==", type),
      where("status", "==", "active"),
    ];
    if (type === "driver") {
      parts.push(where("hasSeats", "==", true));
    }
    if (filterFrom) parts.push(where("fromCity", "==", filterFrom));
    if (filterTo) parts.push(where("toCity", "==", filterTo));
    parts.push(orderBy("departureAt", "asc"));
    parts.push(limit(100));
    return query(collection(db, "rides"), ...parts);
  }, [homeTab, filterFrom, filterTo]);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(
          snap.docs.map((d) => ({
            id: d.id,
            ride: d.data() as RideDoc,
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [q]);

  return (
    <div className="home">
      <div className="filters">
        <CitySelect
          id="f-from"
          label={t("filters.from")}
          value={filterFrom}
          onChange={(v) => setFilterFrom(v as CityKey | "")}
        />
        <CitySelect
          id="f-to"
          label={t("filters.to")}
          value={filterTo}
          onChange={(v) => setFilterTo(v as CityKey | "")}
        />
      </div>

      {loading ? (
        <SkeletonList />
      ) : rows.length === 0 ? (
        <p className="muted padded">
          {homeTab === "drivers" ? t("empty.drivers") : t("empty.passengers")}
        </p>
      ) : (
        <div className="list">
          {rows.map(({ id, ride }) => (
            <RideCard key={id} id={id} ride={ride} />
          ))}
        </div>
      )}

      <button
        type="button"
        className="fab touch-min"
        onClick={() => setChooserOpen(true)}
        aria-label={t("actions.postRide")}
      >
        +
      </button>

      <nav className="tabs" aria-label="Main">
        <button
          type="button"
          className={`tab touch-min ${homeTab === "drivers" ? "active" : ""}`}
          onClick={() => setHomeTab("drivers")}
        >
          {t("tabs.drivers")}
        </button>
        <button
          type="button"
          className={`tab touch-min ${homeTab === "passengers" ? "active" : ""}`}
          onClick={() => setHomeTab("passengers")}
        >
          {t("tabs.passengers")}
        </button>
      </nav>

      {chooserOpen && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setChooserOpen(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t("actions.postRide")}</h2>
            <Link
              className="btn primary touch-min"
              to="/post/driver"
              onClick={() => setChooserOpen(false)}
            >
              {t("actions.asDriver")}
            </Link>
            <Link
              className="btn primary touch-min"
              to="/post/passenger"
              onClick={() => setChooserOpen(false)}
            >
              {t("actions.asPassenger")}
            </Link>
            <button
              type="button"
              className="btn ghost touch-min"
              onClick={() => setChooserOpen(false)}
            >
              {t("actions.cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
