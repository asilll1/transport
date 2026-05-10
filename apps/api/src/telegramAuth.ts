import * as crypto from "crypto";

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): Record<string, string> | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const dataCheckString = pairs.join("\n");
  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const calculatedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");
  if (calculatedHash !== hash) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(initData).entries()) {
    if (k !== "hash") out[k] = v;
  }
  return out;
}

export function parseTelegramUser(verified: Record<string, string>): {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
} | null {
  const raw = verified.user;
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    if (!user?.id) return null;
    return {
      id: String(user.id),
      firstName: user.first_name,
      lastName: user.last_name,
      username: user.username,
      languageCode: user.language_code,
    };
  } catch {
    return null;
  }
}
