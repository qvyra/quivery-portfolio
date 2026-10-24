// The admin session cookie's name, on its own so proxy.ts can read it without
// pulling in the server helpers. __Secure- makes browsers refuse it without
// HTTPS, so it's only used in production
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Secure-admin_session"
    : "admin_session";
