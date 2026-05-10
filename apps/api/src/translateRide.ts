import * as crypto from "crypto";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { toAllLanguages } from "./libreTranslate";

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
      data.type === "driver" && typeof cm?.original === "string"
        ? cm.original
        : "",
  };
}

export function translationContentHash(data: DocumentData): string {
  const p = textFieldsPayload(data);
  return crypto.createHash("sha256").update(JSON.stringify(p)).digest("hex");
}

async function fillMapField(
  baseUrl: string,
  original: string,
  apiKey?: string
): Promise<{ original: string; en: string; ru: string; ky: string }> {
  const t = await toAllLanguages(baseUrl, original, apiKey);
  return { original, ...t };
}

export async function applyTranslationsToRide(
  ref: DocumentReference,
  data: DocumentData,
  libreUrl: string,
  libreApiKey?: string
): Promise<void> {
  const hash = translationContentHash(data);
  if (data.translationContentHash === hash) {
    return;
  }

  const fromDetail = await fillMapField(
    libreUrl,
    textFieldsPayload(data).fromDetail,
    libreApiKey
  );
  const toDetail = await fillMapField(
    libreUrl,
    textFieldsPayload(data).toDetail,
    libreApiKey
  );
  const price = await fillMapField(
    libreUrl,
    textFieldsPayload(data).price,
    libreApiKey
  );
  const notes = await fillMapField(
    libreUrl,
    textFieldsPayload(data).notes,
    libreApiKey
  );

  let carModel:
    | { original: string; en: string; ru: string; ky: string }
    | undefined;
  if (data.type === "driver") {
    carModel = await fillMapField(
      libreUrl,
      textFieldsPayload(data).carModel,
      libreApiKey
    );
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
