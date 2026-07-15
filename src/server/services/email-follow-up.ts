const OUTBOUND_FOLLOW_UP_BUSINESS_DAYS = 2;

function isWeekend(date: Date) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function addBusinessDays(date: Date, days: number) {
  const result = new Date(date);
  let remaining = days;

  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (!isWeekend(result)) {
      remaining -= 1;
    }
  }

  return result;
}

export function outboundEmailFollowUp(input: {
  sentAt: Date;
  subject?: string | null;
  opportunityName?: string | null;
}) {
  const context = input.opportunityName || input.subject || "correo enviado";

  return {
    title: `Follow up correo enviado: ${context}`,
    dueDate: addBusinessDays(input.sentAt, OUTBOUND_FOLLOW_UP_BUSINESS_DAYS),
  };
}
