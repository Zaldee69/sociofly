import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Mail, UserPlus, Loader2, Crown, Zap, Shield, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Role, BillingPlan } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper functions for plan display
const getPlanIcon = (plan: string) => {
  switch (plan) {
    case "FREE":
      return Crown;
    case "PRO":
      return Zap;
    case "ENTERPRISE":
      return Shield;
    default:
      return Crown;
  }
};

const getPlanColor = (plan: string) => {
  switch (plan) {
    case "FREE":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "PRO":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "ENTERPRISE":
      return "bg-violet-100 text-violet-800 border-violet-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
};

// Define the form schema with validation
const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  team: z.string().min(1, { message: "Please select a team" }),
  teamId: z.string().min(1, { message: "Please select a team" }).optional(),
  message: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Team {
  id: string;
  name: string;
  description: string;
}

interface AddMemberModalProps {
  teams: Team;
  onAddMember: (values: FormValues) => Promise<void>;
}

// Custom hook for handling member invitation
const useInviteMember = (
  onAddMember: (values: FormValues) => Promise<void>
) => {
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handler for dialog open state changes
  const handleDialogChange = (open: boolean) => {
    // Prevent closing if currently inviting
    if (!isInviting || open) {
      setIsDialogOpen(open);
    }
  };

  const inviteMember = async (values: FormValues) => {
    setIsInviting(true);
    try {
      await onAddMember(values);
      setIsDialogOpen(false); // Close dialog on success
      return true;
    } catch (error) {
      console.error("Error inviting member:", error);
      return false;
    } finally {
      setIsInviting(false);
    }
  };

  return {
    isInviting,
    inviteMember,
    isDialogOpen,
    setIsDialogOpen,
    handleDialogChange,
  };
};

// Define built-in role descriptions
const roleDescriptions: Record<string, string> = {
  MANAGER: "Manage campaigns and content",
  SUPERVISOR: "Manage campaigns and content",
  CONTENT_CREATOR: "Create and manage content",
  INTERNAL_REVIEWER: "Review content and approve/reject",
  CLIENT_REVIEWER: "Review content and approve/reject",
  ANALYST: "View analytics and reports",
  INBOX_AGENT: "Manage inbox and replies",
};

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  teams,
  onAddMember,
}) => {
  const router = useRouter();
  const { isInviting, inviteMember, isDialogOpen, handleDialogChange } =
    useInviteMember(onAddMember);

  // Get available roles (built-in and custom)
  const [availableRoles, setAvailableRoles] = useState<
    { label: string; value: string; description: string }[]
  >([]);

  // Member quota state
  const [quotaInfo, setQuotaInfo] = useState<{
    current: number;
    limit: number | string;
    percentage: number;
    isUnlimited: boolean;
    canAdd: boolean;
  } | null>(null);

  // Get custom roles from API
  const { data: customRoles } = trpc.team.getCustomRoles.useQuery(
    { teamId: teams.id },
    { enabled: !!teams.id }
  );

  // Get team subscription for quota info
  const { data: teamSubscription } = trpc.team.getEffectiveSubscription.useQuery(
    { teamId: teams.id },
    { enabled: !!teams.id }
  );

  // Get member quota information
  const { data: memberQuota } = trpc.team.getMemberQuota.useQuery(
    { teamId: teams.id },
    { enabled: !!teams.id }
  );

  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "CONTENT_CREATOR",
      team: teams.name,
      teamId: teams.id,
      message: "",
    },
  });

  // Update quota info when member quota changes
  useEffect(() => {
    if (memberQuota) {
      setQuotaInfo(memberQuota);
    }
  }, [memberQuota]);

  // Combine built-in roles and custom roles
  useEffect(() => {
    const builtInRoles = Object.values(Role)
      // Filter out OWNER role which shouldn't be assigned through invitation
      .filter((role) => role !== "OWNER" && role !== ("TEAM_OWNER" as Role))
      .map((role) => ({
        label: role
          .replace(/_/g, " ")
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        value: role,
        description:
          roleDescriptions[role] || `${role.replace(/_/g, " ")} role`,
      }));

    const customRolesList =
      customRoles?.map((role) => ({
        label:
          role.displayName ||
          role.name
            .replace(/_/g, " ")
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" "),
        value: role.name,
        description: role.description || `Custom role`,
      })) || [];

    setAvailableRoles([...builtInRoles, ...customRolesList]);
  }, [customRoles]);

  const onSubmit = async (values: FormValues) => {
    // Check quota before inviting
    if (quotaInfo && !quotaInfo.canAdd) {
      const plan = teamSubscription?.subscriptionPlan || "FREE";
      const message = plan === "FREE" 
        ? "FREE plan doesn't allow adding team members. Upgrade to PRO or ENTERPRISE to invite team members."
        : `Member limit reached. Your ${plan} plan allows up to ${quotaInfo.limit} team members.`;
      
      form.setError("root", {
        message,
      });
      return;
    }

    const success = await inviteMember(values);
    if (success) {
      form.reset();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          onClick={() => handleDialogChange(true)}
          disabled={quotaInfo?.canAdd === false}
        >
          <UserPlus className="h-4 w-4" />
          {quotaInfo?.canAdd === false ? "Limit Reached" : "Invite Member"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <div className="relative">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to add a new member to your team.
            </DialogDescription>
            
            {/* Tier and Quota Information */}
            {teamSubscription && quotaInfo && (
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`${getPlanColor(teamSubscription.subscriptionPlan || "FREE")} font-medium`}
                  >
                    {React.createElement(getPlanIcon(teamSubscription.subscriptionPlan || "FREE"), {
                      className: "h-3 w-3 mr-1",
                    })}
                    {teamSubscription.subscriptionPlan || "FREE"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                     {quotaInfo.current} / {quotaInfo.isUnlimited ? '∞' : quotaInfo.limit} members
                   </span>
                </div>
                {!quotaInfo.isUnlimited && (
                  <div className="flex-1 max-w-[120px] ml-4">
                    <Progress value={quotaInfo.percentage} className="h-2" />
                  </div>
                )}
              </div>
            )}
            
            {/* Member Limit Reached Alert */}
             {quotaInfo && !quotaInfo.canAdd && (
               <Alert className="mt-4 border-amber-200 bg-amber-50">
                 <AlertTriangle className="h-4 w-4 text-amber-600" />
                 <AlertDescription className="text-amber-800">
                   <div className="flex items-center justify-between">
                     <span>
                       {(teamSubscription?.subscriptionPlan || "FREE") === "FREE" 
                         ? "FREE plan doesn't allow team members. Upgrade to invite team members."
                         : "Member limit reached. Upgrade your plan to invite more team members."
                       }
                     </span>
                     <Button
                       variant="outline"
                       size="sm"
                       className="ml-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                       onClick={() => router.push("/billing")}
                     >
                       Upgrade Plan
                     </Button>
                   </div>
                 </AlertDescription>
               </Alert>
             )}
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 py-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          className="pl-9"
                          placeholder="email@example.com"
                          disabled={isInviting}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          disabled={isInviting}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Pilih Role" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <FormControl>
                        <Input defaultValue={teams.name} disabled readOnly />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personalized Message (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter a personalized message to include in the invitation email"
                        className="resize-none"
                        disabled={isInviting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display form errors */}
              {form.formState.errors.root && (
                <div className="text-sm text-red-600 mt-2">
                  {form.formState.errors.root.message}
                </div>
              )}

              <DialogFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={isInviting || quotaInfo?.canAdd === false}
                  className="w-full sm:w-auto"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : quotaInfo?.canAdd === false ? (
                    "Limit Reached"
                  ) : (
                    "Send Invitation"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberModal;
