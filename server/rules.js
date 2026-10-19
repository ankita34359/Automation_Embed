// The business rules. Pure functions only: no I/O, no env, no viaSocket.

// "10-digit number, we add 91 for you". Returns the stored form (12 digits starting 91) or null if invalid.
// Not just startsWith("91"): 9123456789 is a valid 10-digit number that happens to start with 91.
export function normalizePhone(raw) {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) return "91" + digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  return null;
}

// "IET_DAVV" when the dropdown value is IET or DAVV, or typed text contains the whole word IET or DAVV.
// Word boundaries keep "VIET" or "Daviet" from matching.
export function collegeGroup(college) {
  return /(?<![\p{L}\p{N}_])(IET|DAVV)(?![\p{L}\p{N}_])/iu.test(String(college ?? "")) ? "IET_DAVV" : "OTHER";
}

// Exactly gmail.com. Not endsWith or includes: x@notgmail.com and x@gmail.com.evil.com are not Gmail.
export function isGmail(email) {
  const e = String(email ?? "").trim().toLowerCase();
  const at = e.lastIndexOf("@");
  return at > 0 && e.slice(at + 1) === "gmail.com";
}

export const COLLEGE_CHOICES = ["IET", "DAVV", "Other"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates the public form. Returns { ok: true, value } or { ok: false, errors: { field: message } }.
export function validateRegistration(input) {
  const body = input && typeof input === "object" ? input : {};
  const errors = {};
  const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
  const email = String(body.email ?? "").trim().toLowerCase();
  const phoneRaw = String(body.phone ?? "").trim();
  const choice = String(body.college ?? "").trim();
  const other = String(body.college_other ?? "").trim().replace(/\s+/g, " ");

  if (name.length < 2) errors.name = "Enter your full name";
  else if (name.length > 100) errors.name = "Name is too long";

  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = "Enter a valid email address";

  const phone = normalizePhone(phoneRaw);
  if (!phone) errors.phone = "Enter a 10-digit mobile number";

  let college = "";
  if (!COLLEGE_CHOICES.includes(choice)) errors.college = "Choose your college";
  else if (choice === "Other") {
    if (other.length < 2) errors.college_other = "Enter your college name";
    else if (other.length > 120) errors.college_other = "College name is too long";
    else college = other;
  } else college = choice;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { name, email, phone_raw: phoneRaw.slice(0, 40), phone, college, college_group: collegeGroup(college), is_gmail: isGmail(email) },
  };
}
