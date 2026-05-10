import * as crypto from "crypto";
import { v2 } from "@google-cloud/translate";
import type {
  DocumentData,
  DocumentReference,
} from "firebase-admin/firestore";
import { logger } from "firebase-functions";

const translateClient = new v2.Translate();

type Lang = "en" | "ru" | "ky";

const LANGS: Lang[] = ["en", "ru", "ky"];

function textFieldsPayload(data: DocumentData): Record<string, string> {
  const fd = data.fromDetail;
  const td = data.toDetail;
  const pr = data.price;
  const nt = data.notes;
  const cm = data.carModel;
  return {
    fromDetail: typeof fd?.original === "string" ? fd.original : "",
    toDetail: typeof td?.original === "string" ? td.original : "",
    price: typeof pr?.original === "string" ? pr.original : "",
    notes: typeof nt?.original === "string" ? nt.original : "",
    carModel:
      data.type === "driver" && typeof cm?.original === "string" ? cm.original : "",
  };
}

export function translationContentHash(data: DocumentData): string {
  const p = textFieldsPayload(data);
  return crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex");
}

async function toAllLanguages(text: string): Promise<Record<Lang, string>> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { en: "", ru: "", ky: "" };
  }
  const out: Record<Lang, string> = { en: "", ru: "", ky: "" };
  for (const lang of LANGS) {
    try {
      const [translated] = await translateClient.translate(trimmed, lang);
      out[lang] = Array.isArray(translated) ? translated[0] : translated;
    } catch (e) {
      logger.warn("translate failed", { lang, err: String(e) });
      out[lang] = trimmed;
    }
  }
  return out;
}

async function fillMapField(
  original: string
): Promise<{ original: string; en: string; ru: string; ky: string }> {
  const t = await toAllLanguages(original);
  return { original, ...t };
}

export async function applyTranslationsToRide(
  ref: DocumentReference,
  data: DocumentData
): Promise<void> {
  const hash = translationContentHash(data);
  if (data.translationContentHash === hash) {
    return;
  }

  const fromDetail = await fillMapField(textFieldsPayload(data).fromDetail);
  const toDetail = await fillMapField(textFieldsPayload(data).toDetail);
  const price = await fillMapField(textFieldsPayload(data).price);
  const notes = await fillMapField(textFieldsPayload(data).notes);

  let carModel: { original: string; en: string; ru: string; ky: string } | undefined;
  if (data.type === "driver") {
    carModel = await fillMapField(textFieldsPayload(data).carModel);
  }

  const patch: Record<string, unknown> = {
    fromDetail,
    toDetail,
    price,
    notes,
    translationContentHash: hash,
  };
  if (carModel) {
    patch.carModel = carModel;
  }

  await ref.update(patch);
}

export function rideNeedsTranslation(
  before: DocumentData | undefined,
  after: DocumentData
): boolean {
  if (!after || after.status === "deleted") return false;
  const h = translationContentHash(after);
  if (after.translationContentHash === h) return false;
  if (!before) return true;
  return translationContentHash(before) !== h;
}
