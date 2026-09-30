export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

/** Formats a credit amount the way the reference design writes numbers. */
export function formatCredits(value: number): string {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Math.round(value)));
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

/** "3 分钟前" style relative time for task lists. */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.348],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY]
  ];

  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
  let amount = diffSeconds;
  for (const [unit, limit] of units) {
    if (Math.abs(amount) < limit) return formatter.format(Math.round(amount), unit);
    amount /= limit;
  }
  return formatter.format(Math.round(amount), "year");
}

export function formatPrice(amountInCents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: amountInCents % 100 === 0 ? 0 : 2
  }).format(amountInCents / 100);
}

export function absoluteUrl(path = "/"): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
