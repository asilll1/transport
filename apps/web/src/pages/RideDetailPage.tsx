import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { doc, getDoc } from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { useAuth } from "../hooks/AuthContext";
import type { RideDoc } from "../lib/types";
import { pickLocalized } from "../lib/text";
import { coerceDate } from "../lib/dates";
import type { CityKey } from "../lib/cities";
import { formatPriceWithKgs } from "../lib/priceDisplay";

export function RideDetailPage() {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { firebaseUser } = useAuth();
  const [ride, setRide] = useState<RideDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const snap = await getDoc(doc(getDb(), "rides", id));
      if (cancelled) return;
      if (!snap.exists()) setRide(null);
      else setRide(snap.data() as RideDoc);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) return null;
  if (loading) {
    return <div className="padded muted">{t("loading")}</div>;
  }
  if (!ride) {
    return (
      <div className="padded">
        <p>{t("error.generic")}</p>
        <Link to="/">{t("actions.back")}</Link>
      </div>
    );
  }

  const lang = i18n.language;
  const when = coerceDate(ride.departureAt);
  const isOwner = firebaseUser?.uid === ride.authorId;
  const tgUrl = ride.authorUsername
    ? `https://t.me/${ride.authorUsername}`
    : null;

  return (
    <div className="padded detail">
      <Link to="/" className="ghost-link">
        {t("actions.back")}
      </Link>
      <h1>
        {t(`cities.${ride.fromCity as CityKey}`)} →{" "}
        {t(`cities.${ride.toCity as CityKey}`)}
      </h1>
      <p className="chip">
        {when.toLocaleString(undefined, {
          dateStyle: "full",
          timeStyle: "short",
        })}
      </p>
      {ride.status === "expired" && (
        <span className="badge muted">{t("ride.expired")}</span>
      )}

      <section className="detail-section">
        <h2>{t("ride.when")}</h2>
        <p>{when.toLocaleString()}</p>
      </section>

      <section className="detail-section">
        <h2>{t("form.departureDetail")}</h2>
        <p>{pickLocalized(ride.fromDetail, lang) || "—"}</p>
        <h2>{t("form.destinationDetail")}</h2>
        <p>{pickLocalized(ride.toDetail, lang) || "—"}</p>
      </section>

      <section className="detail-section">
        <h2>{t("form.price")}</h2>
        <p>{formatPriceWithKgs(pickLocalized(ride.price, lang))}</p>
      </section>

      {ride.type === "driver" && (
        <section className="detail-section">
          <h2>{t("form.carModel")}</h2>
          <p>{pickLocalized(ride.carModel, lang) || "—"}</p>
          <h2>{t("form.seats")}</h2>
          <p>{ride.seatsAvailable ?? "—"}</p>
        </section>
      )}

      {ride.type === "passenger" && (
        <section className="detail-section">
          <h2>{t("form.passengers")}</h2>
          <p>{ride.passengerCount ?? "—"}</p>
        </section>
      )}

      <section className="detail-section">
        <h2>{t("form.notes")}</h2>
        <p>{pickLocalized(ride.notes, lang) || "—"}</p>
      </section>

      <section className="detail-section">
        <h2>{ride.type === "driver" ? t("ride.driver") : t("ride.passenger")}</h2>
        <p>{ride.authorName}</p>
      </section>

      <p className="notice small">{t("form.privacy")}</p>

      <div className="contact-bar">
        <a className="btn primary touch-min" href={`tel:${ride.authorPhone}`}>
          {t("actions.call")} {ride.authorPhone}
        </a>
        {tgUrl && (
          <a
            className="btn ghost touch-min"
            href={tgUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t("actions.chatTelegram")}
          </a>
        )}
      </div>

      {isOwner && (
        <div className="owner-actions">
          <Link className="btn ghost touch-min" to={`/edit/${id}`}>
            {t("actions.edit")}
          </Link>
        </div>
      )}
    </div>
  );
}
