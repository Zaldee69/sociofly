// src/app/api/auth/reset-password/route.ts
import { createClient } from "@/lib/utils/supabase/server"
import { resetPasswordSchema } from "@/lib/validations/auth"
import { NextResponse } from "next/server"
import { type NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = resetPasswordSchema.parse(body)

    const supabase = await createClient()
    const { data, error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
      redirectTo: `${request.nextUrl.origin}/auth/callback`,
    })

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to register" },
      { status: 400 }
    )
  }
}