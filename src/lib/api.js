// Thin fetch wrapper. Errors carry .status and .data so screens can react to 401 / 409 / 400 field errors.
export async function api(path, { method = "GET", body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    const err = new Error("Can't reach the server. Check your connection and try again.");
    err.status = 0;
    throw err;
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty or not JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || "Something went wrong. Please try again.");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
