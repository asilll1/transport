import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  addDoc,
  collection,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "../lib/firebase";
import { useAuth } from "../hooks/AuthContext";
import { CitySelect } from "../components/CitySelect";
import type { CityKey } from "../lib/cities";
import { isCityKey } from "../lib/cities";
import { combineLocalDateAndTime, coerceDate } from "../lib/dates";
import { syncRideAfterWrite } from "../lib/syncRide";
import type { RideDoc, RideType } from "../lib/types";

type Mode = "driver" | "passenger";

export function PostRidePage() {
  const { mode } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { firebaseUser, telegram } = useAuth();

  const rideType: Mode | null =
    mode === "driver" || mode === "passenger" ? mode : null;

  const [fromCity, setFromCity] = useState<CityKey | "">("");
  const [toCity, setToCity] = useState<CityKey | "">("");
  const [fromDetail, setFromDetail] = useState("");
  const [toDetail, setToDetail] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");
  const [seats, setSeats] = useState(3);
  const [passengers, setPassengers] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    const d = now.toISOString().slice(0, 10);
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setDateStr(d);
    setTimeStr(`${hh}:${mm}`);
  }, []);

  const title = useMemo(() => {
    if (rideType === "driver") return t("actions.asDriver");
    if (rideType === "passenger") return t("actions.asPassenger");
    return "";
  }, [rideType, t]);

  if (!rideType || !firebaseUser || !telegram) {
    return (
      <div className="padded">
        <p className="error">{t("error.generic")}</p>
        <Link to="/">{t("actions.back")}</Link>
      </div>
    );
  }

  async function submit() {
    if (!firebaseUser || !telegram) return;
    setErr(null);
    if (!fromCity || !toCity || !isCityKey(fromCity) || !isCityKey(toCity)) {
      setErr(t("form.required"));
      return;
    }
    if (fromCity === toCity) {
      setErr(t("form.sameCity"));
      return;
    }
    const dep = combineLocalDateAndTime(dateStr, timeStr);
    if (dep.getTime() <= Date.now()) {
      setErr(t("form.pastTime"));
      return;
    }
    if (!phone.trim()) {
      setErr(t("form.required"));
      return;
    }
    if (rideType === "driver" && !carModel.trim()) {
      setErr(t("form.required"));
      return;
    }
    if (rideType === "driver" && !price.trim()) {
      setErr(t("form.required"));
      return;
    }

    const authorName = [telegram.firstName, telegram.lastName]
      .filter(Boolean)
      .join(" ");
    const base = {
      type: rideType as RideType,
      status: "active" as const,
      createdAt: serverTimestamp(),
      departureAt: Timestamp.fromDate(dep),
      authorId: firebaseUser.uid,
      authorName: authorName || telegram.username || "User",
      authorPhone: phone.trim(),
      authorUsername: telegram.username ?? null,
      fromCity,
      toCity,
      fromDetail: { original: fromDetail.trim() },
      toDetail: { original: toDetail.trim() },
      price: { original: price.trim() || "—" },
      notes: { original: notes.trim() },
      notifiedExpiringSoon: false,
    };

    const payload =
      rideType === "driver"
        ? {
            ...base,
            seatsAvailable: seats,
            seatsTotal: seats,
            carModel: { original: carModel.trim() },
            hasSeats: seats > 0,
          }
        : {
            ...base,
            passengerCount: passengers,
          };

    setSaving(true);
    try {
      const docRef = await addDoc(collection(getDb(), "rides"), payload);
      void syncRideAfterWrite(docRef.id);
      nav("/");
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="padded form-page">
      <div className="form-header">
        <Link to="/" className="ghost-link">
          {t("actions.back")}
        </Link>
        <h1>{title}</h1>
      </div>

      <p className="notice">{t("form.privacy")}</p>

      <CitySelect
        id="p-from"
        label={t("form.departureCity")}
        value={fromCity}
        exclude={toCity || undefined}
        onChange={setFromCity}
      />
      <label className="field">
        <span className="label">{t("form.departureDetail")}</span>
        <input
          className="input"
          value={fromDetail}
          onChange={(e) => setFromDetail(e.target.value)}
        />
      </label>

      <CitySelect
        id="p-to"
        label={t("form.destinationCity")}
        value={toCity}
        exclude={fromCity || undefined}
        onChange={setToCity}
      />
      <label className="field">
        <span className="label">{t("form.destinationDetail")}</span>
        <input
          className="input"
          value={toDetail}
          onChange={(e) => setToDetail(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">{t("form.date")}</span>
        <input
          className="input touch-min"
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="label">{t("form.time")}</span>
        <input
          className="input touch-min"
          type="time"
          value={timeStr}
          onChange={(e) => setTimeStr(e.target.value)}
        />
      </label>

      {rideType === "driver" ? (
        <>
          <label className="field">
            <span className="label">{t("form.price")}</span>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.carModel")}</span>
            <input
              className="input"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.seats")}</span>
            <input
              className="input touch-min"
              type="number"
              min={1}
              max={8}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span className="label">{t("form.passengers")}</span>
            <input
              className="input touch-min"
              type="number"
              min={1}
              max={8}
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.priceExpectation")}</span>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </>
      )}

      <label className="field">
        <span className="label">{t("form.phone")}</span>
        <input
          className="input"
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">{t("form.notes")}</span>
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {err && <p className="error">{err}</p>}

      <button
        type="button"
        className="btn primary touch-min"
        disabled={saving}
        onClick={() => void submit()}
      >
        {t("actions.save")}
      </button>
    </div>
  );
}

export function EditRidePage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const nav = useNavigate();
  const { firebaseUser, telegram } = useAuth();

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [rideType, setRideType] = useState<RideType | null>(null);
  const [fromCity, setFromCity] = useState<CityKey | "">("");
  const [toCity, setToCity] = useState<CityKey | "">("");
  const [fromDetail, setFromDetail] = useState("");
  const [toDetail, setToDetail] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [timeStr, setTimeStr] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [phone, setPhone] = useState("");
  const [carModel, setCarModel] = useState("");
  const [seats, setSeats] = useState(3);
  const [passengers, setPassengers] = useState(1);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id || !firebaseUser) return;
    let cancelled = false;
    (async () => {
      const ref = doc(getDb(), "rides", id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setLoading(false);
        return;
      }
      const r = snap.data() as RideDoc;
      if (r.authorId !== firebaseUser.uid) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setRideType(r.type);
      setFromCity(r.fromCity);
      setToCity(r.toCity);
      setFromDetail(r.fromDetail?.original ?? "");
      setToDetail(r.toDetail?.original ?? "");
      setPrice(r.price?.original ?? "");
      setNotes(r.notes?.original ?? "");
      setPhone(r.authorPhone ?? "");
      setCarModel(r.carModel?.original ?? "");
      setSeats(r.seatsAvailable ?? r.seatsTotal ?? 1);
      setPassengers(r.passengerCount ?? 1);
      const dt = coerceDate(r.departureAt);
      const y = dt.getFullYear();
      const mo = String(dt.getMonth() + 1).padStart(2, "0");
      const da = String(dt.getDate()).padStart(2, "0");
      setDateStr(`${y}-${mo}-${da}`);
      const hh = String(dt.getHours()).padStart(2, "0");
      const mm = String(dt.getMinutes()).padStart(2, "0");
      setTimeStr(`${hh}:${mm}`);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, firebaseUser]);

  if (!id || !firebaseUser || !telegram) {
    return null;
  }

  if (forbidden) {
    return (
      <div className="padded">
        <p className="error">{t("error.generic")}</p>
        <Link to="/">{t("actions.back")}</Link>
      </div>
    );
  }

  if (loading || !rideType) {
    return <div className="padded muted">{t("loading")}</div>;
  }

  async function submit() {
    if (!id || !firebaseUser || !telegram) return;
    setErr(null);
    if (!fromCity || !toCity) {
      setErr(t("form.required"));
      return;
    }
    if (fromCity === toCity) {
      setErr(t("form.sameCity"));
      return;
    }
    const dep = combineLocalDateAndTime(dateStr, timeStr);
    if (dep.getTime() <= Date.now()) {
      setErr(t("form.pastTime"));
      return;
    }
    if (!phone.trim()) {
      setErr(t("form.required"));
      return;
    }
    if (rideType === "driver" && !carModel.trim()) {
      setErr(t("form.required"));
      return;
    }
    if (rideType === "driver" && !price.trim()) {
      setErr(t("form.required"));
      return;
    }

    const patch: Record<string, unknown> = {
      departureAt: Timestamp.fromDate(dep),
      authorPhone: phone.trim(),
      authorUsername: telegram.username ?? null,
      fromCity,
      toCity,
      fromDetail: { original: fromDetail.trim() },
      toDetail: { original: toDetail.trim() },
      price: { original: price.trim() || "—" },
      notes: { original: notes.trim() },
      translationContentHash: deleteField(),
    };

    if (rideType === "driver") {
      patch.seatsAvailable = seats;
      patch.seatsTotal = seats;
      patch.carModel = { original: carModel.trim() };
      patch.hasSeats = seats > 0;
    } else {
      patch.passengerCount = passengers;
    }

    const rideId = id;
    setSaving(true);
    try {
      await updateDoc(doc(getDb(), "rides", rideId), patch);
      void syncRideAfterWrite(rideId);
      nav(`/ride/${rideId}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("error.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="padded form-page">
      <div className="form-header">
        <Link to={`/ride/${id}`} className="ghost-link">
          {t("actions.back")}
        </Link>
        <h1>{t("actions.edit")}</h1>
      </div>

      <p className="notice">{t("form.privacy")}</p>

      <CitySelect
        id="e-from"
        label={t("form.departureCity")}
        value={fromCity}
        exclude={toCity || undefined}
        onChange={setFromCity}
      />
      <label className="field">
        <span className="label">{t("form.departureDetail")}</span>
        <input
          className="input"
          value={fromDetail}
          onChange={(e) => setFromDetail(e.target.value)}
        />
      </label>

      <CitySelect
        id="e-to"
        label={t("form.destinationCity")}
        value={toCity}
        exclude={fromCity || undefined}
        onChange={setToCity}
      />
      <label className="field">
        <span className="label">{t("form.destinationDetail")}</span>
        <input
          className="input"
          value={toDetail}
          onChange={(e) => setToDetail(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">{t("form.date")}</span>
        <input
          className="input touch-min"
          type="date"
          value={dateStr}
          onChange={(e) => setDateStr(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="label">{t("form.time")}</span>
        <input
          className="input touch-min"
          type="time"
          value={timeStr}
          onChange={(e) => setTimeStr(e.target.value)}
        />
      </label>

      {rideType === "driver" ? (
        <>
          <label className="field">
            <span className="label">{t("form.price")}</span>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.carModel")}</span>
            <input
              className="input"
              value={carModel}
              onChange={(e) => setCarModel(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.seats")}</span>
            <input
              className="input touch-min"
              type="number"
              min={0}
              max={8}
              value={seats}
              onChange={(e) => setSeats(Number(e.target.value))}
            />
          </label>
        </>
      ) : (
        <>
          <label className="field">
            <span className="label">{t("form.passengers")}</span>
            <input
              className="input touch-min"
              type="number"
              min={1}
              max={8}
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span className="label">{t("form.priceExpectation")}</span>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </label>
        </>
      )}

      <label className="field">
        <span className="label">{t("form.phone")}</span>
        <input
          className="input"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </label>

      <label className="field">
        <span className="label">{t("form.notes")}</span>
        <textarea
          className="input"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>

      {err && <p className="error">{err}</p>}

      <button
        type="button"
        className="btn primary touch-min"
        disabled={saving}
        onClick={() => void submit()}
      >
        {t("actions.save")}
      </button>
    </div>
  );
}
