import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { useAuth } from "../hooks/AuthContext";
import type { RideDoc } from "../lib/types";
import { RideCard } from "../components/RideCard";

export function MyPostsPage() {
  const { t } = useTranslation();
  const { firebaseUser } = useAuth();
  const [rows, setRows] = useState<{ id: string; ride: RideDoc }[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(getDb(), "rides"),
      where("authorId", "==", firebaseUser.uid),
      orderBy("departureAt", "desc"),
      limit(100)
    );
    return onSnapshot(q, (snap) => {
      setRows(
        snap.docs.map((d) => ({ id: d.id, ride: d.data() as RideDoc }))
      );
    });
  }, [firebaseUser]);

  async function adjustSeat(id: string, delta: number, current: number) {
    const next = Math.max(0, Math.min(8, current + delta));
    const ref = doc(getDb(), "rides", id);
    await updateDoc(ref, {
      seatsAvailable: next,
      hasSeats: next > 0,
    });
  }

  async function removeRide(id: string) {
    if (!confirm(t("actions.confirmDelete"))) return;
    await deleteDoc(doc(getDb(), "rides", id));
  }

  return (
    <div className="padded my-posts">
      <h1>{t("nav.myPosts")}</h1>
      {rows.length === 0 ? (
        <p className="muted">{t("empty.myPosts")}</p>
      ) : (
        <div className="list">
          {rows.map(({ id, ride }) => (
            <div key={id} className="my-post-wrap">
              {ride.status === "expired" && (
                <span className="badge muted">{t("ride.expired")}</span>
              )}
              <RideCard id={id} ride={ride} />
              <div className="row-actions">
                {ride.type === "driver" && ride.status === "active" && (
                  <>
                    <button
                      type="button"
                      className="btn ghost touch-min"
                      aria-label={t("actions.decreaseSeat")}
                      onClick={() =>
                        void adjustSeat(
                          id,
                          -1,
                          ride.seatsAvailable ?? 0
                        )
                      }
                    >
                      −1
                    </button>
                    <button
                      type="button"
                      className="btn ghost touch-min"
                      aria-label={t("actions.increaseSeat")}
                      onClick={() =>
                        void adjustSeat(
                          id,
                          1,
                          ride.seatsAvailable ?? 0
                        )
                      }
                    >
                      +1
                    </button>
                  </>
                )}
                <Link className="btn ghost touch-min" to={`/edit/${id}`}>
                  {t("actions.edit")}
                </Link>
                <button
                  type="button"
                  className="btn danger touch-min"
                  onClick={() => void removeRide(id)}
                >
                  {t("actions.delete")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
