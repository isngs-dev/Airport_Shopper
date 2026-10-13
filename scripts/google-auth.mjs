/**
 * One-time helper: signs in the calendar owner and prints a refresh token for GOOGLE_REFRESH_TOKEN.
 *
 *   1. Google Cloud Console: enable the "Google Calendar API", create OAuth client credentials of type "Desktop app".
 *   2. Put GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 *   3. npm run google:auth, open the printed link, sign in with the account whose calendar should receive bookings
 *      AND that should send the confirmation mails (the Gmail API sends as this account).
 */
import http from "node:http";

const id = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.GOOGLE_CLIENT_SECRET;
if (!id || !secret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first.");
  process.exit(1);
}

const PORT = 53682;
const redirect = `http://localhost:${PORT}/oauth2callback`;
const scope = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
  "https://www.googleapis.com/auth/gmail.send", // confirmation mails are sent from this account
].join(" ");

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: "code", scope, access_type: "offline", prompt: "consent" });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, redirect);
  if (url.pathname !== "/oauth2callback") return res.writeHead(404).end();
  const code = url.searchParams.get("code");
  if (!code) {
    res.writeHead(400).end("No code received.");
    return;
  }
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: id, client_secret: secret, redirect_uri: redirect, grant_type: "authorization_code" }),
  });
  const body = await r.json();
  if (!body.refresh_token) {
    res.writeHead(500).end("No refresh token returned. Remove the app from https://myaccount.google.com/permissions and try again.");
    console.error(body);
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" }).end("Done. You can close this tab and return to the terminal.");
    console.log("\nGOOGLE_REFRESH_TOKEN=" + body.refresh_token + "\n\nAdd this to .env (and to Render's environment). Keep it secret.");
  }
  server.close();
});

server.listen(PORT, () => {
  console.log("Open this link in your browser and sign in:\n\n" + authUrl + "\n");
});
