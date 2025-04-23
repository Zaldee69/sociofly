// src/app/(auth-pages)/reset-password/page.tsx
import { AuthCard } from "@/components/ui/auth-card"
import { PasswordResetForm } from "@/components/auth/reset-password-form"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Reset Password",
  description: "Reset your password",
}

export default function ResetPasswordPage() {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center">
      <AuthCard
        title="Reset password"
        description="Enter your email address and we will send you a reset link"
      >
        <PasswordResetForm />
      </AuthCard>
    </div>
  )
}