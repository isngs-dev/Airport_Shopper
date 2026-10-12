/**
 * Where every "apply" button sends the visitor.
 * Change it here, or set VITE_APPLY_URL in a .env file (see .env.example).
 */
export const APPLY_URL: string = import.meta.env.VITE_APPLY_URL || "https://example.com/apply";

/**
 * Endpoint that receives the contact form as JSON (name, company, phone, email).
 * Set VITE_FORM_ENDPOINT at build time. Without it the form only simulates success in dev.
 */
export const FORM_ENDPOINT: string = import.meta.env.VITE_FORM_ENDPOINT || "";
