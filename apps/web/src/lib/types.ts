import type { CityKey } from "./cities";

export type RideType = "driver" | "passenger";
export type RideStatus = "active" | "expired" | "deleted";

export type LangField = {
  original: string;
  en?: string;
  ru?: string;
  ky?: string;
};

export type RideDoc = {
  type: RideType;
  status: RideStatus;
  createdAt?: unknown;
  departureAt: { seconds: number; nanoseconds: number } | Date | unknown;
  authorId: string;
  authorName: string;
  authorPhone: string;
  authorUsername?: string | null;
  fromCity: CityKey;
  toCity: CityKey;
  fromDetail: LangField;
  toDetail: LangField;
  price: LangField;
  notes: LangField;
  seatsAvailable?: number;
  seatsTotal?: number;
  carModel?: LangField;
  passengerCount?: number;
  hasSeats?: boolean;
  notifiedExpiringSoon?: boolean;
  notifiedRidePublished?: boolean;
  translationContentHash?: string;
};
