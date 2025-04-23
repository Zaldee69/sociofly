import { RegisterForm } from "@/components/auth/register-form";
import { AuthCard } from "@/components/ui/auth-card";

export default function Register() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <AuthCard
        title="Welcome back"
        description="Enter your email to sign in to your account"
      >
        <RegisterForm />
      </AuthCard>
    </div>
  );
}
