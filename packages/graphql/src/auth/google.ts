import { OAuth2Client } from "google-auth-library";

export interface GoogleProfile {
  googleId: string;
  email: string;
  name: string | null;
}

function client(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI must all be set",
    );
  }

  return new OAuth2Client({ clientId, clientSecret, redirectUri });
}

export function buildAuthUrl(): string {
  return client().generateAuthUrl({
    access_type: "offline",
    scope: ["profile", "email"],
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  });
}

/** Exchanges the one-time code from `/login?code=...` for a verified profile. */
export async function exchangeCode(code: string): Promise<GoogleProfile> {
  const oauth = client();
  const { tokens } = await oauth.getToken(code);

  if (!tokens.id_token) {
    throw new Error("No ID token returned from Google");
  }

  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new Error("Google token contained no email");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? null,
  };
}
