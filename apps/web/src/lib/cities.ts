export const CITY_KEYS = [
  "bishkek",
  "osh",
  "jalalabad",
  "karakol",
  "tokmok",
  "kant",
  "naryn",
  "talas",
  "batken",
  "balykchy",
] as const;

export type CityKey = (typeof CITY_KEYS)[number];

export function isCityKey(s: string): s is CityKey {
  return (CITY_KEYS as readonly string[]).includes(s);
}
