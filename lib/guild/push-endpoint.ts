// The subscription table can also be written via Supabase's public API.
// Recheck on dispatch so it cannot be used to send server-side HTTP to an arbitrary host.
export function validPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 2048) return false;
  try {
    const url = new URL(endpoint);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password && (!url.port || url.port === "443") && (
      host === "fcm.googleapis.com" ||
      host === "updates.push.services.mozilla.com" ||
      host === "web.push.apple.com" || host.endsWith(".push.apple.com") ||
      host.endsWith(".notify.windows.com")
    );
  } catch { return false; }
}
