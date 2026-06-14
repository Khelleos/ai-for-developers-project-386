/**
 * Runtime configuration for the frontend.
 *
 * `VITE_API_BASE_URL` points at the call-booking backend. During development it
 * defaults to the Prism mock launched from the emitted OpenAPI document
 * (`npm run mock`), which listens on port 4010.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4010";
