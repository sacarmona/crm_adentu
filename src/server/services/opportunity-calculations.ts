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
