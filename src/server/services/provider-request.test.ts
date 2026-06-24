import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchProviderWithRetry, mapInBatches } from "./provider-request";

describe("provider request controls", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("retries rate limited requests", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));
    const sleep = vi.fn(async () => undefined);

    const response = await fetchProviderWithRetry("https://example.com", undefined, {
      sleep,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
  });

  it("does not retry client errors", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 400 }));

    expect(
      (await fetchProviderWithRetry("https://example.com")).status,
    ).toBe(400);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("limits concurrent work by batches", async () => {
    let active = 0;
    let maximum = 0;
    const results = await mapInBatches(
      [1, 2, 3, 4, 5, 6],
      2,
      async (value) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await Promise.resolve();
        active -= 1;
        return value * 2;
      },
      async () => undefined,
    );

    expect(results).toEqual([2, 4, 6, 8, 10, 12]);
    expect(maximum).toBeLessThanOrEqual(2);
  });
});
