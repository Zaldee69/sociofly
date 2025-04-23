// src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.post("/api/auth/login", async ({ request }) => {
    const body = (await request.json()) as any;
    if (body.email === "test@example.com" && body.password === "password123") {
      return HttpResponse.json({
        data: {
          user: {
            id: "123",
            email: "test@example.com",
          },
        },
      });
    }
    return HttpResponse.json({ error: "Invalid credentials" }, { status: 400 });
  }),
];