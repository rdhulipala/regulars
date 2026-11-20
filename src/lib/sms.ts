// Thin wrapper so the rest of the app never imports Twilio directly.
// Without env vars set, this just logs — the app is fully usable in dev
// and in the demo without a Twilio account.

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;

export async function sendSms(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[sms:stub] to=${to} :: ${body}`);
    return { stub: true };
  }

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM_NUMBER, Body: body })
    }
  );
  if (!res.ok) {
    console.error("[sms] Twilio send failed", await res.text());
  }
  return res;
}
