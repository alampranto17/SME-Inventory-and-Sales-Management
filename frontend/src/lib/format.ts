// Formatting helpers for showing data nicely.

// "1234.5" -> "৳1,234.50"
export function formatMoney(value: string | number | null | undefined) {
  const number = Number(value ?? 0);
  return (
    "৳" +
    number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// "2026-06-06T13:00:00.000Z" -> "Jun 6, 2026, 7:00 PM"
export function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

// Date -> "2026-06-06" (for <input type="date">)
export function toInputDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
