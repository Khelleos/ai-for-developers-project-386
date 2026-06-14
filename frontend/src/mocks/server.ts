import { setupServer } from "msw/node";

/**
 * Shared MSW server for tests. Individual tests register handlers with
 * `server.use(...)`; the lifecycle (listen/reset/close) is managed in
 * `vitest.setup.ts`.
 */
export const server = setupServer();
