import { describe, expect, it } from "vitest";

import { calculateOpportunityAmounts } from "./opportunity-calculations";

describe("calculateOpportunityAmounts", () => {
  it("calculates CLP price, monthly, total and weighted amounts", () => {
    expect(
      calculateOpportunityAmounts({
        price: 10,
        exchangeRate: 950,
        quantity: 2,
        months: 6,
        probability: 0.5,
      }),
    ).toEqual({
      priceClp: 9_500,
      monthlyAmount: 19_000,
      totalAmount: 114_000,
      weightedAmount: 57_000,
    });
  });

  it("rounds every persisted monetary amount to two decimals", () => {
    expect(
      calculateOpportunityAmounts({
        price: 1.005,
        exchangeRate: 1,
        quantity: 3,
        months: 2,
        probability: 0.3333,
      }),
    ).toEqual({
      priceClp: 1.01,
      monthlyAmount: 3.03,
      totalAmount: 6.06,
      weightedAmount: 2.02,
    });
  });

  it("supports zero probability without changing the total amount", () => {
    expect(
      calculateOpportunityAmounts({
        price: 100_000,
        exchangeRate: 1,
        quantity: 1,
        months: 12,
        probability: 0,
      }),
    ).toMatchObject({
      totalAmount: 1_200_000,
      weightedAmount: 0,
    });
  });
});
