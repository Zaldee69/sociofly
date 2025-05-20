import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Mail, UserPlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Role } from "@prisma/client";

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
  const { isInviting, inviteMember, isDialogOpen, setIsDialogOpen } =
    useInviteMember(onAddMember);

  // Get available roles (built-in and custom)
  const [availableRoles, setAvailableRoles] = useState<
    { label: string; value: string; description: string }[]
  >([]);

  // Get custom roles from API
  const { data: customRoles } = trpc.team.getCustomRoles.useQuery(
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
    const success = await inviteMember(values);
    if (success) {
      form.reset();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="flex items-center gap-2"
          onClick={() => setIsDialogOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Invite Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to add a new member to your team.
          </DialogDescription>
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
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                disabled={isInviting}
                className="w-full sm:w-auto"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Invitation...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberModal;
