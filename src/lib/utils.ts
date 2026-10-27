import { clsx, type ClassValue } from "clsx";
import {
  differenceInCalendarDays,
  format,
  isToday,
  isTomorrow,
  isYesterday,
  startOfDay,
} from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function formatDate(date: Date | string | null | undefined, pattern = "d MMM yyyy") {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, pattern, { locale: es });
}

export function formatLongDate(date: Date) {
  const text = format(date, "EEEE d 'de' MMMM", { locale: es });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export type DueTone = "muted" | "default" | "warning" | "critical";

/** Human-friendly due date: "Hoy", "Mañana", "Ayer", "En 3 días", "Hace 2 días". */
export function describeDueDate(
  date: Date | null | undefined,
  completed = false,
): { text: string; tone: DueTone } {
  if (!date) return { text: "Sin fecha", tone: "muted" };
  const today = startOfDay(new Date());
  const diff = differenceInCalendarDays(startOfDay(date), today);
  if (completed) return { text: formatDate(date, "d MMM"), tone: "muted" };
  if (isToday(date)) return { text: "Hoy", tone: "warning" };
  if (isTomorrow(date)) return { text: "Mañana", tone: "default" };
  if (isYesterday(date)) return { text: "Ayer", tone: "critical" };
  if (diff < 0) return { text: `Hace ${Math.abs(diff)} días`, tone: "critical" };
  if (diff <= 7) return { text: `En ${diff} días`, tone: "default" };
  return { text: formatDate(date, "d MMM"), tone: "default" };
}

export function timeAgo(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "hace un momento";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return formatDate(date, "d MMM");
}

/** Parse an <input type="date"> value into a local noon Date (avoids timezone day shifts). */
export function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
}

export function toDateInputValue(date: Date | null | undefined) {
  if (!date) return "";
  return format(date, "yyyy-MM-dd");
}

export function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}
