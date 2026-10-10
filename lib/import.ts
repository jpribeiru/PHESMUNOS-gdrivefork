import { countryFlag } from "./countries";
export function parseCSV(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && input[i + 1] === "\n") i++;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quote in CSV.");
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function validateImport(
  rows: string[][],
  mapping: Record<string, number>,
  existingEmails: (string | null)[],
) {
  const seen = new Set(existingEmails.filter((e): e is string => !!e).map((e) => e.toLowerCase()));
  return rows.map((row, i) => {
    const name = row[mapping.name] || "",
      country = row[mapping.country] || "",
      email = row[mapping.email] || "";
    const errors: string[] = [];
    if (!name) errors.push("Name is required");
    if (!country) errors.push("Country is required");
    // Email is optional; when present it must be valid and unique (blank cells are never duplicates).
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Invalid email");
    if (email && seen.has(email.toLowerCase())) errors.push("Duplicate email");
    if (email) seen.add(email.toLowerCase());
    // The flag is derived from the country text; staff never type an emoji.
    return { line: i + 2, name, country, flag: countryFlag(country), email, errors };
  });
}
