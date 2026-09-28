import { describe, expect, it } from "vitest";
import { guardGuildApiRequest } from "./request-security";

const base = {
  pathname: "/api/guild/meal-wish",
  method: "POST",
  requestOrigin: "https://guild.gia2018.com",
  originHeader: "https://guild.gia2018.com",
  contentLengthHeader: "128",
};

describe("guardGuildApiRequest", () => {
  it("allows normal same-origin mutations", () => {
    expect(guardGuildApiRequest(base)).toBeNull();
  });

  it("rejects cross-origin browser mutations", () => {
    expect(guardGuildApiRequest({ ...base, originHeader: "https://evil.example" })).toEqual({
      status: 403,
      message: "Forbidden origin",
    });
  });

  it("allows server-to-server calls without Origin", () => {
    expect(guardGuildApiRequest({ ...base, originHeader: null })).toBeNull();
  });

  it("rejects oversized bodies", () => {
    expect(guardGuildApiRequest({ ...base, contentLengthHeader: "65537" })).toEqual({
      status: 413,
      message: "Request body too large",
    });
  });

  it("does not affect non-guild APIs or read requests", () => {
    expect(guardGuildApiRequest({ ...base, pathname: "/api/stripe/webhook" })).toBeNull();
    expect(guardGuildApiRequest({ ...base, method: "GET" })).toBeNull();
  });
});
