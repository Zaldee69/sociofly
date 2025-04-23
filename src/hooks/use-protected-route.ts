// src/hooks/use-protected-route.ts
import { useAuthStore } from '@/lib/stores/use-auth-store'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

interface UseProtectedRouteOptions {
  redirectTo?: string
}

export function useProtectedRoute(options: UseProtectedRouteOptions = {}) {
  const { redirectTo = '/auth/login' } = options
  const { user, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(redirectTo)
    }
  }, [user, isLoading, redirectTo, router])

  return { isLoading, user }
}