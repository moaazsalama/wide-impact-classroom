export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  if (Number.isNaN(diffSeconds)) return '';
  if (diffSeconds < 60) return 'just now';
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return pluralize(days, 'day') + ' ago';
  return formatDate(iso);
}

/** "483920" -> "483 920" for readability. */
export function formatJoinCode(code: string): string {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
