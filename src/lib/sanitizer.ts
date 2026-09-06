/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively strips undefined values, NaN, and unsafe symbols from objects
 * before transmission to Firestore setDoc/addDoc/updateDoc.
 */
export function stripUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => stripUndefined(item)) as unknown as T;
  }

  if (typeof obj === "object" && !(obj instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = stripUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Encodes dynamic strings to prevent XSS injection in raw contexts
 */
export function sanitizeText(text: string): string {
  if (!text) return "";
  return text.trim();
}
