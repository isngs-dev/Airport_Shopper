/**
 * Where every "apply" button sends the visitor.
 * Change it here, or set VITE_APPLY_URL in a .env file (see .env.example).
 */
export const APPLY_URL: string = import.meta.env.VITE_APPLY_URL || "https://example.com/apply";

/** Contact form endpoint. Defaults to the bundled server (server/index.mjs); override with VITE_FORM_ENDPOINT. */
export const FORM_ENDPOINT: string = import.meta.env.VITE_FORM_ENDPOINT || "/api/contact";
