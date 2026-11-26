// Keep extension digits out of carrier phone validation and normalization.
export function stripPhoneExtension(phone: string): string {
  return phone.replace(/(?:ext(?:ension)?\.?|x)\s*\d+\s*$/i, "").trim();
}
