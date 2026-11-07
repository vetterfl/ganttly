import { parseDate } from "../core/dates";
import type { DateFormat } from "../settings/settings";

const formatters = new Map<string, Intl.DateTimeFormat>();
function localeFormatter(locale: string | undefined): Intl.DateTimeFormat {
  const key = locale ?? "";
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" });
    formatters.set(key, f);
  }
  return f;
}

/**
 * Format an ISO (YYYY-MM-DD) date according to the date-format view setting.
 * "locale" ("Language default") formats in `locale` — the app language's
 * locale from useI18n().
 */
export function formatDate(isoDate: string, fmt: DateFormat, locale?: string): string {
  if (fmt === "iso") return isoDate;
  const [y, m, d] = isoDate.split("-");
  if (fmt === "dmy") return `${d}.${m}.${y}`;
  return localeFormatter(locale).format(parseDate(isoDate));
}

export const formatDateObj = (d: Date, fmt: DateFormat, locale?: string): string =>
  formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, fmt, locale);
