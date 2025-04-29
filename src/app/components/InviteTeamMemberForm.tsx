"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

const ROLE_DESCRIPTIONS = {
  admin: "Akses penuh untuk mengelola tim dan mengundang anggota",
  supervisor: "Dapat mengelola konten dan melihat laporan",
  contributor: "Dapat membuat dan mengedit konten",
} as const;

const formSchema = z.object({
  email: z
    .string()
    .min(1, "Email harus diisi")
    .email("Format email tidak valid")
    .refine((email) => email.length <= 255, "Email terlalu panjang")
    .refine((email) => {
      // Common email providers validation
      const commonProviders = [
        "@gmail.com",
        "@yahoo.com",
        "@hotmail.com",
        "@outlook.com",
      ];
      return commonProviders.some((provider) =>
        email.toLowerCase().endsWith(provider)
      );
    }, "Gunakan email dari provider yang umum (Gmail, Yahoo, Hotmail, atau Outlook)"),
  role: z.enum(["admin", "supervisor", "contributor"], {
    required_error: "Pilih role untuk anggota tim",
    invalid_type_error: "Role tidak valid",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface InviteTeamMemberFormProps {
  teamId: string;
}

export default function InviteTeamMemberForm({
  teamId,
}: InviteTeamMemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingData, setPendingData] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      role: "contributor",
    },
  });

  const handleFormSubmit = (data: FormValues) => {
    setPendingData(data);
    setShowConfirmDialog(true);
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);
    setError("");
    setSuccess("");
    setShowConfirmDialog(false);

    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Terjadi kesalahan saat mengirim undangan"
        );
      }

      const successMessage =
        result.type === "direct_add"
          ? "Anggota berhasil ditambahkan ke tim!"
          : "Undangan berhasil dikirim!";

      toast.success("Berhasil!", {
        description: successMessage,
      });

      setSuccess(successMessage);
      form.reset();
      router.refresh();
    } catch (error) {
      console.error("Error inviting team member:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat mengirim undangan";

      toast.error("Gagal!", {
        description: errorMessage,
      });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Undang Anggota Tim</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="email@example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Gunakan email dari provider yang umum (Gmail, Yahoo,
                      Hotmail, atau Outlook)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      disabled={isLoading}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih role anggota" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="contributor">
                          Contributor
                          <span className="block text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.contributor}
                          </span>
                        </SelectItem>
                        <SelectItem value="supervisor">
                          Supervisor
                          <span className="block text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.supervisor}
                          </span>
                        </SelectItem>
                        <SelectItem value="admin">
                          Admin
                          <span className="block text-xs text-muted-foreground">
                            {ROLE_DESCRIPTIONS.admin}
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-600 border-green-200">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  "Kirim Undangan"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Undangan</DialogTitle>
            <DialogDescription>
              Anda akan mengirim undangan ke anggota tim dengan detail berikut:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-500" />
              <p className="text-sm font-medium">Email: {pendingData?.email}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Info className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Role: {pendingData?.role}</p>
                <p className="text-xs text-muted-foreground">
                  {pendingData?.role && ROLE_DESCRIPTIONS[pendingData.role]}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button
              onClick={() => pendingData && onSubmit(pendingData)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mengirim...
                </>
              ) : (
                "Konfirmasi"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
