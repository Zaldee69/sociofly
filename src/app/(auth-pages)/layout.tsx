// src/app/(auth-pages)/layout.tsx
import { createClient } from "@/lib/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}