import { describe, expect, it } from "vitest";
import { validPushEndpoint } from "./push-endpoint";

describe("validPushEndpoint", () => {
  it("主要ブラウザーのPushサービスのみ許可する", () => {
    expect(validPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(validPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(validPushEndpoint("https://web.push.apple.com/Qabc")).toBe(true);
  });

  it("任意のサーバーやURL偽装を拒否する", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/send/abc",
      "https://127.0.0.1/secret",
      "https://fcm.googleapis.com.evil.example/send/abc",
      "https://fcm.googleapis.com@evil.example/send/abc",
      "https://fcm.googleapis.com:8443/send/abc",
      "https://evil.example/push.apple.com/abc",
    ]) expect(validPushEndpoint(endpoint)).toBe(false);
  });
});
