export const NCV_LEVEL_OPTIONS = [
  { value: 1, label: "NCV Level 2" },
  { value: 2, label: "NCV Level 3" },
  { value: 3, label: "NCV Level 4" },
] as const;

export function ncvLevelLabel(value: number | null | undefined) {
  return NCV_LEVEL_OPTIONS.find((option) => option.value === value)?.label ?? "NCV level not set";
}

export function ncvLevelNumber(value: number | null | undefined) {
  const option = NCV_LEVEL_OPTIONS.find((item) => item.value === value);
  return option ? option.value + 1 : null;
}

export function academicPeriodForNcvLevel(level: string | null | undefined) {
  const match = String(level ?? "").match(/[234]/)?.[0];
  return match ? Math.max(1, Math.min(3, Number(match) - 1)) : 1;
}
