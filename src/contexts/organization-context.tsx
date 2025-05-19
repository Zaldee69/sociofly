"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Organization {
  id: string;
  name: string;
  role?: string;
  mediaCount?: number;
  createdAt?: Date;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  setSelectedOrganization: (org: Organization) => void;
  isLoading: boolean;
  switchOrganization: (orgId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const OrganizationContext = createContext<OrganizationContextType>({
  selectedOrganization: null,
  organizations: [],
  setSelectedOrganization: () => {},
  isLoading: true,
  switchOrganization: async () => {},
  hasPermission: () => false,
});

const STORAGE_KEY = "selectedOrganization";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [selectedOrganization, setSelectedOrganization] =
    useState<Organization | null>(null);
  const [isSwitch, setIsSwitch] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { data: organizations = [], isLoading } =
    trpc.organization.getAll.useQuery(undefined, {
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      retry: 2,
    });

  const utils = trpc.useUtils();

  // Initialize organization on data load
  useEffect(() => {
    if (!isInitialized && organizations.length > 0) {
      const storedOrgId = localStorage.getItem(STORAGE_KEY);
      const org = storedOrgId
        ? organizations.find((o: Organization) => o.id === storedOrgId)
        : organizations[0];

      console.log("org", organizations[0].id, storedOrgId);

      if (org) {
        setSelectedOrganization(org);
        localStorage.setItem(STORAGE_KEY, org.id);
      }
      setIsInitialized(true);
    }
  }, [organizations, isInitialized]);

  const switchOrganization = useCallback(
    async (orgId: string) => {
      setIsSwitch(true);
      try {
        const org = organizations.find((o) => o.id === orgId);
        if (!org) throw new Error("Organization not found");

        setSelectedOrganization(org);
        localStorage.setItem(STORAGE_KEY, org.id);

        // Only cancel current queries instead of invalidating
        utils.media.getAll.cancel();

        // Start prefetching the new organization's data
        await utils.media.getAll.prefetch({
          organizationId: org.id,
          page: 1,
          limit: 5,
        });

        toast.success(`Switched to ${org.name}`);
      } catch (error) {
        toast.error("Failed to switch organization");
      } finally {
        setIsSwitch(false);
      }
    },
    [organizations, utils]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!selectedOrganization) return false;

      // Add your permission logic here
      // Example: check if user has required role for the permission
      const userRole = selectedOrganization.role;

      switch (permission) {
        case "upload":
          return ["ADMIN", "EDITOR"].includes(userRole || "");
        case "delete":
          return userRole === "ADMIN";
        default:
          return false;
      }
    },
    [selectedOrganization]
  );

  // Show loading state while initializing
  if (isLoading && !isInitialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        organizations,
        setSelectedOrganization,
        isLoading: isLoading || isSwitch,
        switchOrganization,
        hasPermission,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
