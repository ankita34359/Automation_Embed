import { loadEnvFile } from "./env.js";
loadEnvFile();

const { openDb } = await import("./db.js");
const { createApp } = await import("./app.js");

const needed = ["VIASOCKET_ORG_ID", "VIASOCKET_PROJECT_ID", "VIASOCKET_EMBED_SECRET", "VIASOCKET_UNIQUE_ID", "ADMIN_PASSWORD", "SESSION_SECRET"];
const missing = needed.filter((n) => !process.env[n]);
if (missing.length) console.warn(`Missing environment variables (admin features stay off until set): ${missing.join(", ")}`);

const db = openDb();
const port = Number(process.env.PORT) || 3001;
createApp({ db }).listen(port, "0.0.0.0", () => console.log(`HireDrive listening on 0.0.0.0:${port}`));
