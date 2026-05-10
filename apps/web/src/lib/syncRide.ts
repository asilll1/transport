import { getFirebaseAuth, apiBaseUrl } from "./firebase";

/** Calls JolDosh API: LibreTranslate + optional “ride published” Telegram message. */
export async function syncRideAfterWrite(rideId: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return;
  let token: string;
  try {
    token = await user.getIdToken();
  } catch {
    return;
  }
  try {
    const res = await fetch(`${apiBaseUrl()}/api/rides/${rideId}/sync`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      console.warn("syncRideAfterWrite", res.status, await res.text());
    }
  } catch (e) {
    console.warn("syncRideAfterWrite", e);
  }
}
