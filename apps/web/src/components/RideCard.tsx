import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { RideDoc } from "../lib/types";
import { pickLocalized } from "../lib/text";
import { coerceDate } from "../lib/dates";
import type { CityKey } from "../lib/cities";
import { formatPriceWithKgs } from "../lib/priceDisplay";

type Props = {
  ride: RideDoc;
  id: string;
};

export function RideCard({ ride, id }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const when = coerceDate(ride.departureAt);
  const from = t(`cities.${ride.fromCity as CityKey}`);
  const to = t(`cities.${ride.toCity as CityKey}`);
  const price = formatPriceWithKgs(pickLocalized(ride.price, lang));
  const isDriver = ride.type === "driver";

  return (
    <Link className="ride-card" to={`/ride/${id}`}>
      <div className="ride-card__route">
        {from} → {to}
      </div>
      <div className="ride-card__meta">
        <span className="chip">
          {when.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
        {isDriver && ride.seatsAvailable != null && (
          <span
            className={`badge ${ride.seatsAvailable > 0 ? "ok" : "muted"}`}
          >
            {t("ride.seats")}: {ride.seatsAvailable}
          </span>
        )}
        {!isDriver && ride.passengerCount != null && (
          <span className="badge ok">
            {t("form.passengers")}: {ride.passengerCount}
          </span>
        )}
      </div>
      <div className="ride-card__row">
        <span className="price">{price || "—"}</span>
        <span className="name">{ride.authorName}</span>
      </div>
      {isDriver && ride.carModel && (
        <div className="muted small">
          {pickLocalized(ride.carModel, lang)}
        </div>
      )}
    </Link>
  );
}
