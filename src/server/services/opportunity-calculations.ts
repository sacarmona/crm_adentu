export function calculateOpportunityAmounts(input: {
  price: number;
  exchangeRate: number;
  quantity: number;
  months: number;
  probability: number;
}) {
  const priceClp = input.price * input.exchangeRate;
  const monthlyAmount = priceClp * input.quantity;
  const totalAmount = monthlyAmount * input.months;
  const weightedAmount = totalAmount * input.probability;

  return {
    priceClp,
    monthlyAmount,
    totalAmount,
    weightedAmount,
  };
}

