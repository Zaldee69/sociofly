import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import {
  Permission,
  UserRole,
  AuthUser,
  ROLE_PERMISSIONS,
} from "@/lib/types/auth";

interface UserProfile {
  role: UserRole;
}

export async function withRoleAuth(
  request: NextRequest,
  config: {
    requiredRole?: UserRole[];
    requiredPermissions?: Permission[];
  },
  handler: (user: AuthUser) => Promise<NextResponse>
) {
  try {
    const supabase = await createClient();

    // Get user session
    const {
      data: { user },
      error: sessionError,
    } = await supabase.auth.getUser();

    if (sessionError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's role and permissions from your database
    let userProfile: UserProfile | null = await supabase
      .from("user_profile")
      .select("role")
      .eq("user_id", user.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          return null;
        }
        return data as UserProfile;
      });

    if (!userProfile) {
      // If user profile doesn't exist, create one with default role
      const { data: newProfile, error: createError } = await supabase
        .from("user_profile")
        .insert([
          {
            user_id: user.id,
            role: UserRole.CONTRIBUTOR,
          },
        ])
        .select()
        .single();

      if (createError || !newProfile) {
        return NextResponse.json(
          { error: "Failed to create user profile" },
          { status: 500 }
        );
      }

      userProfile = newProfile as UserProfile;
    }

    // Create AuthUser object with permissions based on role
    const authUser: AuthUser = {
      ...user,
      role: userProfile.role,
      permissions: ROLE_PERMISSIONS[userProfile.role],
    };

    // Check role if required
    if (config.requiredRole && !config.requiredRole.includes(authUser.role)) {
      return NextResponse.json(
        { error: "Insufficient role permissions" },
        { status: 403 }
      );
    }

    // Check permissions if required
    if (config.requiredPermissions) {
      const hasAllPermissions = config.requiredPermissions.every((permission) =>
        authUser.permissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }
    }

    // Call the handler with the authenticated and authorized user
    return await handler(authUser);
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
