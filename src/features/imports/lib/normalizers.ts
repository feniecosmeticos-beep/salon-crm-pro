export function normalizeText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim().replace(/\s+/g, " ");

  return normalized.length > 0 ? normalized : null;
}

export function normalizePhone(value: unknown): string | null {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const digits = text.replace(/\D/g, "");

  return digits.length > 0 ? digits : null;
}

export function normalizeEmail(value: unknown): string | null {
  const text = normalizeText(value);

  return text ? text.toLowerCase() : null;
}

export function normalizeBrazilianDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === "number") {
    return normalizeExcelSerialDate(value);
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const numericValue = Number(text);

  if (Number.isFinite(numericValue) && /^\d+(\.\d+)?$/.test(text)) {
    return normalizeExcelSerialDate(numericValue);
  }

  const brazilianDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);

  if (brazilianDate) {
    const day = Number(brazilianDate[1]);
    const month = Number(brazilianDate[2]);
    const year = normalizeYear(Number(brazilianDate[3]));

    return formatDateParts(year, month, day);
  }

  const isoDate = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);

  if (isoDate) {
    return formatDateParts(
      Number(isoDate[1]),
      Number(isoDate[2]),
      Number(isoDate[3])
    );
  }

  const parsedDate = new Date(text);

  return Number.isNaN(parsedDate.getTime()) ? null : formatDate(parsedDate);
}

export function normalizeCurrency(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  return parseLocalizedNumber(text.replace(/[^\d,.-]/g, ""));
}

export function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  return parseLocalizedNumber(text.replace(/[^\d,.-]/g, ""));
}

function normalizeYear(year: number): number {
  if (year < 100) {
    return year >= 70 ? 1900 + year : 2000 + year;
  }

  return year;
}

function normalizeExcelSerialDate(serial: number): string | null {
  if (!Number.isFinite(serial) || serial <= 0) {
    return null;
  }

  const utcMilliseconds = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(utcMilliseconds);

  return Number.isNaN(date.getTime()) ? null : formatDate(date);
}

function formatDate(date: Date): string | null {
  return formatDateParts(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

function formatDateParts(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function parseLocalizedNumber(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const commaIndex = normalizedValue.lastIndexOf(",");
  const dotIndex = normalizedValue.lastIndexOf(".");
  let numericText = normalizedValue;

  if (commaIndex > -1 && dotIndex > -1) {
    const decimalSeparator = commaIndex > dotIndex ? "," : ".";
    const thousandSeparator = decimalSeparator === "," ? "." : ",";

    numericText = normalizedValue
      .replaceAll(thousandSeparator, "")
      .replace(decimalSeparator, ".");
  } else if (commaIndex > -1) {
    numericText = normalizedValue.replace(",", ".");
  }

  const parsed = Number(numericText);

  return Number.isFinite(parsed) ? parsed : null;
}
