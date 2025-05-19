import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Mail, UserPlus, Loader2 } from "lucide-react";
import { useState } from "react";

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

const AddMemberModal: React.FC<AddMemberModalProps> = ({
  teams,
  onAddMember,
}) => {
  const { isInviting, inviteMember, isDialogOpen, setIsDialogOpen } =
    useInviteMember(onAddMember);

  // Initialize the form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "CONTENT_PRODUCER",
      team: teams.name,
      teamId: teams.id,
      message: "",
    },
  });

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
                          {[
                            {
                              label: "Campaign Manager",
                              value: "CAMPAIGN_MANAGER",
                              description: "Manage campaigns and content",
                            },
                            {
                              label: "Content Producer",
                              value: "CONTENT_PRODUCER",
                              description: "Create and manage content",
                            },
                            {
                              label: "Client Reviewer",
                              value: "CLIENT_REVIEWER",
                              description: "Review content and approve/reject",
                            },
                            {
                              label: "Analytics Observer",
                              value: "ANALYTICS_OBSERVER",
                              description: "View analytics and reports",
                            },
                            {
                              label: "Inbox Agent",
                              value: "INBOX_AGENT",
                              description: "Manage inbox and replies",
                            },
                            {
                              label: "Content Reviewer",
                              value: "CONTENT_REVIEWER",
                              description: "Review content and approve/reject",
                            },
                          ].map((item) => (
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
