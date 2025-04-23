// src/test/mocks/supabase.ts
import { vi } from "vitest";

export const mockSupabaseClient = {
  auth: {
    signInWithOAuth: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
  },
};

vi.mock("@/lib/supabase/client", () => ({
  createClientSupabaseClient: () => mockSupabaseClient,
}));