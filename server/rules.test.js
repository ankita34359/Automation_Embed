import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizePhone, collegeGroup, isGmail, validateRegistration } from "./rules.js";

test("normalizePhone: 10 digits get 91 added", () => {
  assert.equal(normalizePhone("9876543210"), "919876543210");
  assert.equal(normalizePhone("98765 43210"), "919876543210");
  assert.equal(normalizePhone("98765-43210"), "919876543210");
});

test("normalizePhone: a 10-digit number that starts with 91 still gets 91 added", () => {
  assert.equal(normalizePhone("9123456789"), "919123456789");
});

test("normalizePhone: 12 digits starting 91 are unchanged", () => {
  assert.equal(normalizePhone("919876543210"), "919876543210");
  assert.equal(normalizePhone("+91 98765 43210"), "919876543210");
  assert.equal(normalizePhone("+91-9876543210"), "919876543210");
});

test("normalizePhone: one leading 0 is dropped", () => {
  assert.equal(normalizePhone("09876543210"), "919876543210");
  assert.equal(normalizePhone("0919876543210"), "919876543210");
});

test("normalizePhone: anything else is invalid", () => {
  for (const bad of ["", "   ", null, undefined, "12345", "987654321", "98765432101", "009876543210", "929876543210", "9198765432101", "abcdefghij"]) {
    assert.equal(normalizePhone(bad), null, `expected invalid: ${JSON.stringify(bad)}`);
  }
});

test("collegeGroup: dropdown values", () => {
  assert.equal(collegeGroup("IET"), "IET_DAVV");
  assert.equal(collegeGroup("DAVV"), "IET_DAVV");
  assert.equal(collegeGroup("Other"), "OTHER");
});

test("collegeGroup: typed text with the whole word, any case", () => {
  assert.equal(collegeGroup("iet davv indore"), "IET_DAVV");
  assert.equal(collegeGroup("IET-DAVV, Indore"), "IET_DAVV");
  assert.equal(collegeGroup("Institute of Engineering (IET)"), "IET_DAVV");
  assert.equal(collegeGroup("Davv"), "IET_DAVV");
});

test("collegeGroup: partial words do not match", () => {
  assert.equal(collegeGroup("VIET"), "OTHER");
  assert.equal(collegeGroup("Daviet College"), "OTHER");
  assert.equal(collegeGroup("SIETDAVVX"), "OTHER");
  assert.equal(collegeGroup("Medicaps University"), "OTHER");
  assert.equal(collegeGroup(""), "OTHER");
  assert.equal(collegeGroup(null), "OTHER");
});

test("isGmail: exact gmail.com only, case-insensitive", () => {
  assert.equal(isGmail("a@gmail.com"), true);
  assert.equal(isGmail("A.B+tag@GMAIL.COM"), true);
  assert.equal(isGmail("  a@gmail.com "), true);
});

test("isGmail: lookalikes and other providers are not Gmail", () => {
  for (const e of ["x@notgmail.com", "x@gmail.com.evil.com", "x@mail.gmail.com", "x@googlemail.com", "x@gmail.co", "x@yahoo.com", "gmail.com", "@gmail.com", "", null, undefined]) {
    assert.equal(isGmail(e), false, `expected not gmail: ${JSON.stringify(e)}`);
  }
});

test("validateRegistration: valid IET + Gmail", () => {
  const r = validateRegistration({ name: "  Asha   Verma ", email: " Asha@Gmail.com ", phone: "98765 43210", college: "IET" });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    name: "Asha Verma", email: "asha@gmail.com", phone_raw: "98765 43210", phone: "919876543210",
    college: "IET", college_group: "IET_DAVV", is_gmail: true,
  });
});

test("validateRegistration: Other needs a college name and is grouped by that text", () => {
  assert.equal(validateRegistration({ name: "Ravi", email: "r@x.com", phone: "9876543210", college: "Other" }).errors.college_other, "Enter your college name");
  const r = validateRegistration({ name: "Ravi", email: "r@x.com", phone: "9876543210", college: "Other", college_other: "IET Indore" });
  assert.equal(r.value.college, "IET Indore");
  assert.equal(r.value.college_group, "IET_DAVV");
  const o = validateRegistration({ name: "Ravi", email: "r@x.com", phone: "9876543210", college: "Other", college_other: "VIET" });
  assert.equal(o.value.college_group, "OTHER");
});

test("validateRegistration: reports every bad field", () => {
  const r = validateRegistration({ name: "", email: "nope", phone: "123", college: "MIT" });
  assert.equal(r.ok, false);
  assert.equal(r.errors.phone, "Enter a 10-digit mobile number");
  assert.deepEqual(Object.keys(r.errors).sort(), ["college", "email", "name", "phone"]);
  assert.equal(validateRegistration(null).ok, false);
});
