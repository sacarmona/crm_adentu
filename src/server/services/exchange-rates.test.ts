import { Currency } from "@prisma/client";
import { afterEach, describe, expect, it, vi } from "vitest";

import { historicalClpRate } from "./exchange-rates";

afterEach(() => vi.restoreAllMocks());

describe("historicalClpRate", () => {
  it("returns one for CLP without calling the network", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const result = await historicalClpRate(Currency.CLP, new Date("2026-06-28T12:00:00Z"));
    expect(result?.rate).toBe(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the latest available historical value", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ serie: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ serie: [{ fecha: "2026-06-27T04:00:00.000Z", valor: 915.25 }] }), { status: 200 }));
    const result = await historicalClpRate(Currency.USD, new Date("2026-06-28T12:00:00Z"));
    expect(result?.rate).toBe(915.25);
    expect(result?.source).toBe("mindicador.cl/dolar");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
