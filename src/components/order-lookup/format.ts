import type { YunContact } from "@/types/order-lookup";

export function display(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

export function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

export function copyValue(value: string) {
  return navigator.clipboard.writeText(value);
}

export function contactRows(contact: YunContact) {
  const name = [contact.FirstName, contact.LastName].filter(Boolean).join(" ");

  return [
    { label: "Name", value: name },
    { label: "Company", value: contact.Company },
    { label: "Country", value: contact.CountryCode },
    { label: "Street", value: contact.Street },
    { label: "City", value: contact.City },
    { label: "State", value: contact.State },
    { label: "Zip", value: contact.Zip },
    { label: "Phone", value: contact.Phone },
    { label: "Email", value: contact.Email },
  ].filter((row) => hasValue(row.value));
}
