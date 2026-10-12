/**
 * Where every "apply" button sends the visitor.
 * Change it here, or set VITE_APPLY_URL in a .env file (see .env.example).
 */
export const APPLY_URL: string = import.meta.env.VITE_APPLY_URL || "https://example.com/apply";

/** Base URL of the API (/api/contact, /api/slots). Empty = same origin, i.e. the bundled server in server/. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
