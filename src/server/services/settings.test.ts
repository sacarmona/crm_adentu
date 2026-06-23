import { describe, expect, it } from "vitest";

import { groupDictionaryCounts, slugifyService } from "./settings";

describe("settings", () => {
  it("creates stable service slugs", () => {
    expect(slugifyService("Inspeccion Aerea / LiDAR")).toBe(
      "inspeccion-aerea-lidar",
    );
  });

  it("groups dictionary totals and active values", () => {
    expect(
      groupDictionaryCounts([
        { type: "status", isActive: true },
        { type: "status", isActive: false },
        { type: "currency", isActive: true },
      ]),
    ).toEqual({
      status: { total: 2, active: 1 },
      currency: { total: 1, active: 1 },
    });
  });
});
