const CLOSED_STATUSES = new Set(["WON", "LOST"]);

export function resolveStatusChangeProbability(input: {
  previousStatus: string;
  newStatus: string;
  currentProbability: number;
  probabilityBeforeClose: number | null;
}): { probability: number; probabilityBeforeClose: number | null } {
  const wasClosed = CLOSED_STATUSES.has(input.previousStatus);
  const isClosed = CLOSED_STATUSES.has(input.newStatus);

  if (input.newStatus === "WON") {
    return {
      probability: 1,
      probabilityBeforeClose: wasClosed
        ? input.probabilityBeforeClose
        : input.currentProbability,
    };
  }
  if (input.newStatus === "LOST") {
    return {
      probability: 0,
      probabilityBeforeClose: wasClosed
        ? input.probabilityBeforeClose
        : input.currentProbability,
    };
  }
  if (wasClosed && !isClosed) {
    return {
      probability: input.probabilityBeforeClose ?? input.currentProbability,
      probabilityBeforeClose: null,
    };
  }
  return {
    probability: input.currentProbability,
    probabilityBeforeClose: input.probabilityBeforeClose,
  };
}

export function calculateOpportunityAmounts(input: {
  price: number;
  exchangeRate: number;
  quantity: number;
  months: number;
  probability: number;
}) {
  const roundMoney = (value: number) =>
    Math.round((value + Number.EPSILON) * 100) / 100;

  const priceClp = roundMoney(input.price * input.exchangeRate);
  const monthlyAmount = roundMoney(priceClp * input.quantity);
  const totalAmount = roundMoney(monthlyAmount * input.months);
  const weightedAmount = roundMoney(totalAmount * input.probability);

  return {
    priceClp,
    monthlyAmount,
    totalAmount,
    weightedAmount,
  };
}
