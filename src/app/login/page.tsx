import { signin } from '@/actions/auth'

import { Button } from "@/components/ui/button"

import { Input } from "@/components/ui/input"

import { createClient } from '@/utils/supabase/client'
import { redirect } from 'next/navigation'

export default async function Login() {
    const supabase = createClient()

    const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log(user)

      if(user) {
        redirect('/dashboard')
      }
    
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="w-[350px] border-none shadow-none">
                <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
                <p className="text-sm text-gray-500 text-center mb-4">Sign in to your account to continue.</p>
                <form action={signin}>
                    <div className="flex flex-col space-y-1.5 my-4">
                        <Input id="email" name="email" required placeholder="Email" />
                    </div>
                    <div className="flex flex-col space-y-1.5 my-4">
                        <Input id="password" name="password" required placeholder="Password" />
                    </div>
                    <Button className="w-full" type="submit" >Login</Button>
                </form>
                <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                                or
                            </span>
                        </div>
                    </div>
            </div>
        </div>
    )
}
