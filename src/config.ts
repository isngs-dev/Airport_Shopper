/** Base URL of the API (/api/contact, /api/slots). Empty = same origin, i.e. the bundled server in server/. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
