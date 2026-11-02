const MIN_SCORE = 0.5;

const normalizePhone = (value) => {
  let phone = String(value || "").trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("972")) phone = "0" + phone.slice(3);
  return phone;
};

const cleanName = (value) => String(value || "").trim().replace(/\s+/g, " ");

const validName = (name) => name.length >= 2 && name.length <= 60 && /^[\p{L}][\p{L}\s'’.\-״׳"]*$/u.test(name);

const validPhone = (phone) => /^0(5\d|[23489]|7[2-9])\d{7}$/.test(phone);

const json = (status, body) => Response.json(body, { status });

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, error: "invalid" });
  }

  if (payload._honey) return json(200, { ok: true });

  const name = cleanName(payload.name);
  const phone = normalizePhone(payload.phone);
  const message = String(payload.message || "").trim();
  const token = typeof payload.token === "string" ? payload.token : "";

  if (!validName(name) || !validPhone(phone) || message.length > 1000 || token.length < 20 || token.length > 4000) {
    return json(400, { ok: false, error: "invalid" });
  }

  const secret = process.env.recaptcha_secret_key || process.env.RECAPTCHA_SECRET_KEY;
  if (!secret) {
    console.error("recaptcha_secret_key is not set");
    return json(500, { ok: false, error: "send" });
  }

  const verifyBody = new URLSearchParams({ secret, response: token });
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) verifyBody.set("remoteip", forwarded.split(",")[0].trim());

  let verdict;
  try {
    const verifyResponse = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody
    });
    verdict = await verifyResponse.json();
  } catch (error) {
    console.error("recaptcha verify failed", error instanceof Error ? error.message : "network");
    return json(502, { ok: false, error: "captcha" });
  }

  const passed = verdict.success === true && verdict.action === "contact" && typeof verdict.score === "number" && verdict.score >= MIN_SCORE;
  if (!passed) {
    console.error("recaptcha rejected", Array.isArray(verdict["error-codes"]) ? verdict["error-codes"].join(",") : "score " + verdict.score);
    return json(403, { ok: false, error: "captcha" });
  }

  return json(200, { ok: true });
}
