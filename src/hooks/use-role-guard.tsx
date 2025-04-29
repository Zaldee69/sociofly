import React, { useEffect, type FC, type ComponentType } from "react";
import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Permission, UserRole } from "@/lib/types/auth";
import { useRouter } from "next/navigation";

interface UseRoleGuardConfig {
  requiredRole?: UserRole[];
  requiredPermissions?: Permission[];
  redirectTo?: string;
}

export function useRoleGuard(config: UseRoleGuardConfig) {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    const hasRequiredRole = config.requiredRole
      ? config.requiredRole.includes(user.role)
      : true;

    const hasRequiredPermissions = config.requiredPermissions
      ? config.requiredPermissions.every((permission) =>
          user.permissions.includes(permission)
        )
      : true;

    if (!hasRequiredRole || !hasRequiredPermissions) {
      router.push(config.redirectTo || "/unauthorized");
    }
  }, [user, isLoading, config, router]);

  return {
    isAuthorized: Boolean(
      user &&
        (!config.requiredRole || config.requiredRole.includes(user.role)) &&
        (!config.requiredPermissions ||
          config.requiredPermissions.every((permission) =>
            user.permissions.includes(permission)
          ))
    ),
    isLoading,
    user,
  };
}

interface WithRoleGuardProps {
  [key: string]: any;
}

// HOC for protecting components
export function withRoleGuard<P extends WithRoleGuardProps>(
  WrappedComponent: ComponentType<P>,
  config: UseRoleGuardConfig
): FC<P> {
  return function WithRoleGuardComponent(props: P) {
    const { isAuthorized, isLoading } = useRoleGuard(config);

    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (!isAuthorized) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}
