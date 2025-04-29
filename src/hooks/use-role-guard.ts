import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Permission, UserRole } from "@/lib/types/auth";

interface UseRoleGuardProps {
  requiredRole?: UserRole[];
  requiredPermissions?: Permission[];
  redirectTo?: string;
}

export function useRoleGuard({
  requiredRole,
  requiredPermissions,
  redirectTo = "/",
}: UseRoleGuardProps) {
  const router = useRouter();
  const {
    user,
    hasRole,
    hasPermission,
    isLoading: storeLoading,
  } = useAuthStore();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuthorization = async () => {
      if (!mounted) return;

      // If store is still loading, wait
      if (storeLoading) {
        setIsLoading(true);
        return;
      }

      // If no user and store is not loading, not authorized
      if (!user) {
        if (mounted) {
          setIsAuthorized(false);
          setIsLoading(false);
          if (redirectTo) {
            router.push(redirectTo);
          }
        }
        return;
      }

      // Check role requirements
      const hasRequiredRole = requiredRole
        ? requiredRole.some((role) => hasRole(role))
        : true;

      // Check permission requirements
      const hasRequiredPermissions = requiredPermissions
        ? requiredPermissions.every((permission) => hasPermission(permission))
        : true;

      const authorized = hasRequiredRole && hasRequiredPermissions;

      if (mounted) {
        setIsAuthorized(authorized);
        setIsLoading(false);

        if (!authorized && redirectTo) {
          router.push(redirectTo);
        }
      }
    };

    checkAuthorization();

    return () => {
      mounted = false;
    };
  }, [
    user,
    hasRole,
    hasPermission,
    requiredRole,
    requiredPermissions,
    redirectTo,
    router,
    storeLoading,
  ]);

  return {
    isAuthorized: isAuthorized ?? false,
    isLoading: isLoading || storeLoading,
    user,
  };
}
