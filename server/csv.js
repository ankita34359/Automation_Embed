// CSV export. Cells that start with = + - @ are prefixed so a spreadsheet never runs a candidate's input as a formula.
export function csvCell(value) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = [
  ["id", "ID"], ["name", "Name"], ["email", "Email"], ["phone_raw", "Phone as entered"], ["phone", "Phone"],
  ["college", "College"], ["college_group", "College group"], ["is_gmail", "Gmail"],
  ["sheet_status", "Sheet status"], ["email_status", "Email status"], ["email_kind", "Email kind"], ["created_at", "Registered at"],
];

export function toCsv(rows) {
  const lines = [CSV_COLUMNS.map(([, h]) => h).join(",")];
  for (const r of rows) lines.push(CSV_COLUMNS.map(([k]) => csvCell(k === "is_gmail" ? (r[k] ? "yes" : "no") : r[k])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads UTF-8 names correctly
}
