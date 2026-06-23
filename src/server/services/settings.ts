export function slugifyService(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function groupDictionaryCounts(
  values: { type: string; isActive: boolean }[],
) {
  return values.reduce<Record<string, { total: number; active: number }>>(
    (groups, value) => {
      groups[value.type] ??= { total: 0, active: 0 };
      groups[value.type].total += 1;
      if (value.isActive) groups[value.type].active += 1;
      return groups;
    },
    {},
  );
}
