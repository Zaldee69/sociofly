// src/test/setup.ts
import "@testing-library/jest-dom";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { mockSupabaseClient } from "./mocks/supabase";
import { server } from "./mocks/server";


// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}));

// Setup MSW
beforeAll(async () => {
  console.log("🟢 Starting MSW Server");
  try {
    await server.listen({
      onUnhandledRequest: (req) => {
        console.error(
          `❌ Found an unhandled ${req.method} request to ${req.url.toString()}`
        );
      },
    });
    console.log("✅ MSW Server started successfully");
  } catch (error) {
    console.error("❌ Failed to start MSW Server:", error);
    throw error;
  }
});

afterEach(() => {
  console.log("🔄 Resetting MSW handlers");
  server.resetHandlers();
  vi.clearAllMocks();
});

afterAll(() => {
  console.log("🔴 Stopping MSW Server");
  server.close();
});