// The four viaSocket slots. Each is a one-action flow the HR admin sets up in viaSocket's prebuilt UI.
// App and action ids come from viaSocket's catalog (app search + catalog call), never typed from memory.
// `actionId` is the catalog's action_id (what open: { actionId } takes), not the action_version_id.

const SHEETS = {
  appName: "Google Sheets",
  serviceId: "rowqm5xi2",
  actionName: "Add New Row to Sheet",
  actionId: "rowxsuumuqrt",
  iconUrl: "https://stuff.thingsofbrand.com/google.com/images/img4_googlesheet.png",
};
const GMAIL = {
  appName: "Gmail",
  serviceId: "rowo0bqrhj5g",
  actionName: "Send Email",
  actionId: "rowogelpy0h6",
  iconUrl: "https://stuff.thingsofbrand.com/gmail.com/images/imge_idrA5FDGTH_1763454052978.svg",
};
const AI = {
  appName: "viaSocket AI",
  serviceId: "row29ruc9gs1",
  actionName: "Run AI Model",
  actionId: "rowskkqydb6f",
  iconUrl: "https://stuff.thingsofbrand.com/viasocket.com/images/img5_viasocket.svg",
};

const SHEET_PAYLOAD = { registration_id: 1, name: "Asha Verma", email: "asha@example.com", phone: "919876543210", college: "IET", registered_at: "2026-11-15T09:30:00.000Z" };

export const SLOTS = [
  {
    slot: "sheet_iet_davv",
    title: "IET / DAVV candidates sheet",
    help: "Candidates from IET or DAVV are added here, one row each.",
    setupTip: "Pick your spreadsheet and tab, then map each column to the sample fields (registration_id, name, email, phone, college, registered_at).",
    ...SHEETS,
    dummy_payload: SHEET_PAYLOAD,
  },
  {
    slot: "sheet_other",
    title: "Other colleges sheet",
    help: "Candidates from every other college are added here, one row each.",
    setupTip: "Pick a different spreadsheet or tab from the IET / DAVV one, then map each column to the sample fields.",
    ...SHEETS,
    dummy_payload: SHEET_PAYLOAD,
  },
  {
    slot: "ai_quote",
    title: "AI coding quote",
    help: "Writes a short coding motivational quote for candidates with a Gmail address.",
    setupTip: 'In the message box use the sample fields name and college, for example: "Write one short, original motivational quote (under 25 words) about coding for a candidate named {name} from {college}. Reply with only the quote."',
    ...AI,
    dummy_payload: { name: "Asha Verma", college: "IET" },
  },
  {
    slot: "welcome_email",
    title: "Welcome email sender",
    help: "Sends each welcome email from your Gmail. We write the subject and body.",
    setupTip: "Connect your Gmail, then map To, Subject and Message Body to the sample fields to, subject and body. Do not type your own text: we write it for each candidate.",
    ...GMAIL,
    dummy_payload: { to: "asha@example.com", subject: "Welcome!", body: "<p>Hello Asha</p>" },
  },
];

export const SLOT_NAMES = SLOTS.map((s) => s.slot);

// A flow's run URL always lives here; anything else is refused.
export const FLOW_URL_PREFIX = "https://flow.sokt.io/func/";
