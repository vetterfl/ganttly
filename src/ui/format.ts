import { parseDate } from "../core/dates";
import type { DateFormat } from "../settings/settings";

const localeFmt = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });

/** Format an ISO (YYYY-MM-DD) date according to the date-format view setting. */
export function formatDate(isoDate: string, fmt: DateFormat): string {
  if (fmt === "iso") return isoDate;
  const [y, m, d] = isoDate.split("-");
  if (fmt === "dmy") return `${d}.${m}.${y}`;
  return localeFmt.format(parseDate(isoDate));
}

export const formatDateObj = (d: Date, fmt: DateFormat): string =>
  formatDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`, fmt);
