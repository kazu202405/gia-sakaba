const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type GuildRequestRejection = {
  status: 403 | 413;
  message: string;
};

/**
 * Cookie 認証を使う酒場 API の共通ガード。
 * Origin が付くブラウザ通信は同一オリジンに限定し、巨大なJSONで関数を占有されるのを防ぐ。
 * Cron / DB Webhook のような server-to-server 通信は Origin が付かないため通す。
 */
export function guardGuildApiRequest(input: {
  pathname: string;
  method: string;
  requestOrigin: string;
  originHeader: string | null;
  contentLengthHeader: string | null;
  maxBodyBytes?: number;
}): GuildRequestRejection | null {
  if (!input.pathname.startsWith("/api/guild/") || !MUTATING_METHODS.has(input.method.toUpperCase())) {
    return null;
  }

  if (input.originHeader) {
    try {
      if (new URL(input.originHeader).origin !== new URL(input.requestOrigin).origin) {
        return { status: 403, message: "Forbidden origin" };
      }
    } catch {
      return { status: 403, message: "Forbidden origin" };
    }
  }

  if (input.contentLengthHeader) {
    const contentLength = Number(input.contentLengthHeader);
    const maxBodyBytes = input.maxBodyBytes ?? 64 * 1024;
    if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
      return { status: 413, message: "Request body too large" };
    }
  }

  return null;
}
