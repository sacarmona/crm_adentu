import { describe, expect, it } from "vitest";

import {
  buildMarketOpportunityName,
  marketAssetCoverage,
} from "./market";

describe("market signals", () => {
  it("builds a useful opportunity name from an asset", () => {
    expect(
      buildMarketOpportunityName({
        unitName: "Subestacion Norte",
        serviceName: "Termografia",
      }),
    ).toBe("Termografia - Subestacion Norte");
  });

  it("falls back when the asset has no suggested service", () => {
    expect(
      buildMarketOpportunityName({ unitName: "Planta Demo" }),
    ).toBe("Servicio - Planta Demo");
  });

  it("counts linked company roles", () => {
    expect(
      marketAssetCoverage({
        ownerCompanyId: "owner",
        constructionCompanyId: null,
        omCompanyId: "om",
      }),
    ).toBe(2);
  });
});
