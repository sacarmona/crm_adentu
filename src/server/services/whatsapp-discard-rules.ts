import { digitsOnly } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

export async function findMatchingDiscardRule(phoneNumber: string) {
  const suffix = digitsOnly(phoneNumber).slice(-8);
  if (suffix.length < 6) return null;

  const rules = await prisma.whatsAppDiscardRule.findMany({
    where: { isActive: true },
  });

  return rules.find((rule) => digitsOnly(rule.phoneNumber).endsWith(suffix)) ?? null;
}
