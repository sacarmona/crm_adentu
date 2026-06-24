import { describe, expect, it } from "vitest";

import {
  deploymentReadiness,
  missingProductionVariables,
} from "./runtime-config";

describe("deployment readiness", () => {
  it("reports required production variables", () => {
    expect(
      missingProductionVariables({
        DATABASE_URL: "postgresql://example",
        AUTH_SECRET: "",
      }),
    ).toEqual(["AUTH_SECRET", "AUTH_URL"]);
  });

  it("requires both configuration and database connectivity", () => {
    expect(
      deploymentReadiness({
        missingVariables: [],
        databaseConnected: true,
      }),
    ).toBe(true);
    expect(
      deploymentReadiness({
        missingVariables: ["AUTH_SECRET"],
        databaseConnected: true,
      }),
    ).toBe(false);
  });
});
