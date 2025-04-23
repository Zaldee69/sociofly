// src/hooks/use-auth-login.ts
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { LoginFormData } from "@/lib/validations/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface UseLogin {
  isLoading: boolean;
  login: (data: LoginFormData) => Promise<void>;
}

export function useLogin(): UseLogin {
  const { setUser, setLoading, isLoading } = useAuthStore();
  const router = useRouter();

  async function login(data: LoginFormData) {
    try {
      setLoading(true);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const { data: responseData } = await response.json();
      setUser(responseData.user);

      toast.success("You have successfully logged in.");

      router.push("/dashboard");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to login"
      );
    } finally {
      setLoading(false);
    }
  }

  return { isLoading, login };
}