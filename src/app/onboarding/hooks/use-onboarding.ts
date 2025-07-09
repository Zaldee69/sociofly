import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";

export const useOnboarding = () => {
  const [step, setStep] = useState(1);
  const [userType, setUserType] = useState<"solo" | "team" | null>("team");
  const [orgName, setOrgName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [isRemovingAccount, setIsRemovingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(
    undefined
  );

  const router = useRouter();
  const searchParams = useSearchParams();
  const authUser = useUser();
  const utils = trpc.useUtils();

  const { data: onboardingStatus } =
    trpc.onboarding.getOnboardingStatus.useQuery();

  // Redirect to dashboard if onboarding is completed
  useEffect(() => {
    if (onboardingStatus?.onboardingStatus === "COMPLETED") {
      router.push("/dashboard");
    }
  }, [onboardingStatus, router]);

  const updateOnboardingStatus =
    trpc.onboarding.updateOnboardingStatus.useMutation({
      onError: (error) => {
        console.error("Failed to update onboarding status:", error);
      },
    });

  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Onboarding berhasil diselesaikan!");
      // Force a reload to ensure Clerk session is updated with new metadata
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      console.log(error);
      toast.error("Oops!", {
        description:
          error.message || "Terjadi kesalahan saat menyelesaikan onboarding",
      });
    },
  });

  const sessionId = searchParams?.get("sessionId") ?? "";

  const { data: temporaryData } = trpc.onboarding.getTemporaryData.useQuery({
    sessionId,
  });

  // Cek apakah ada error di temporary data
  useEffect(() => {
    if (temporaryData && typeof temporaryData === "object") {
      // Jika temporaryData adalah object dengan property error dan message, ini adalah error
      if ("error" in temporaryData && "message" in temporaryData) {
        setErrorMessage(temporaryData.message as string);
      } else {
        setErrorMessage(undefined);
      }
    }
  }, [temporaryData]);

  // Mutation untuk menghapus data akun sosial
  const deleteTemporaryData = trpc.onboarding.deleteTemporaryData.useMutation({
    onSuccess: () => {
      toast.success("Akun berhasil dihapus");
      utils.onboarding.getTemporaryData.invalidate({ sessionId });
      setIsRemovingAccount(false);
    },
    onError: (error) => {
      toast.error("Gagal menghapus akun");
      console.error("Error deleting account:", error);
      setIsRemovingAccount(false);
    },
  });

  // Mutation untuk mengupdate data akun terpilih
  const updateTemporaryData = trpc.onboarding.deleteTemporaryData.useMutation({
    onSuccess: () => {
      utils.onboarding.getTemporaryData.invalidate({ sessionId });
    },
    onError: (error) => {
      toast.error("Gagal memilih akun");
      console.error("Error selecting account:", error);
    },
  });

  // Fungsi untuk memfilter data sementara menjadi hanya akun yang dipilih
  const filterAccountData = (selectedAccount: any) => {
    if (!sessionId || !selectedAccount) return;

    const filteredData = [selectedAccount];
    updateTemporaryData.mutate({
      sessionId,
      data: JSON.stringify(filteredData),
    });
  };

  useEffect(() => {
    const step = searchParams?.get("step");
    const savedUserType = searchParams?.get("userType") as
      | "solo"
      | "team"
      | null;

    if (step === "add_social_accounts") {
      setStep(2); // Changed from 3 to 2 for the new 2-step onboarding
      if (savedUserType) {
        setUserType(savedUserType);
      }
    }
  }, [searchParams]);

  const handleUserTypeSelect = (type: "solo" | "team") => {
    setUserType(type);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);

      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddTeamEmail = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && currentEmail.trim() !== "") {
      e.preventDefault();
      if (currentEmail.includes("@") && !teamEmails.includes(currentEmail)) {
        setTeamEmails([...teamEmails, currentEmail]);
        setCurrentEmail("");
      } else {
        toast.error("Masukkan alamat email yang valid");
      }
    }
  };

  const removeEmail = (email: string) => {
    setTeamEmails(teamEmails.filter((e) => e !== email));
  };

  const handleSocialToggle = (platform: "FACEBOOK" | "INSTAGRAM") => {
    // Create a state object with all the parameters we want to pass
    const stateData = {
      userId: authUser.user?.id,
      userType,
      orgName,
      teamEmails: teamEmails.join(","),
    };

    // Encode the state data using encodeURIComponent
    const encodedState = encodeURIComponent(JSON.stringify(stateData));

    if (platform === "FACEBOOK") {
      window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&state=${encodedState}&redirect_uri=${encodeURIComponent(
        `${window.location.origin}/api/auth/callback/facebook`
      )}&scope=email,business_management,pages_show_list,pages_read_engagement,read_insights,pages_read_user_content,pages_manage_posts,pages_manage_cta,pages_manage_engagement,pages_manage_metadata`;
    } else if (platform === "INSTAGRAM") {
      window.location.href = `https://www.facebook.com/v22.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&state=${encodedState}&redirect_uri=${encodeURIComponent(
        `${window.location.origin}/api/auth/callback/instagram`
      )}&scope=instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,instagram_manage_insights,business_management`;
    }
  };

  // Fungsi untuk menghapus akun sosial
  const handleSocialRemove = () => {
    if (!sessionId) return;

    setIsRemovingAccount(true);

    // Delete all temporary data instead of just filtering out the specific platform
    deleteTemporaryData.mutate({
      sessionId,
      data: JSON.stringify([]),
    });
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleNext = (selectedAccount?: any) => {
    if (step === 1) {
      // Update onboarding status to IN_PROGRESS when first clicking next
      updateOnboardingStatus.mutate({ status: "IN_PROGRESS" });
      setStep(2); // Always go to team creation step
    } else {
      const teams = searchParams?.get("teamEmails");
      const types =
        userType || (searchParams?.get("userType") as "solo" | "team");
      const emails =
        teamEmails.length > 0
          ? teamEmails
          : teams?.length! > 0
            ? teams?.split(",").map((email) => email.trim())
            : [];

      const organizationName =
        types === "team"
          ? orgName || (searchParams?.get("orgName") as string)
          : undefined;

      // If selectedAccount is provided, use only that account for pagesData
      const finalPagesData = selectedAccount
        ? [selectedAccount]
        : temporaryData;

      completeOnboarding.mutate({
        userType: types!,
        teamName: organizationName,
        teamEmails: types === "team" ? emails : undefined,
        pagesData: finalPagesData,
        socialAccounts: {
          facebook: true,
          instagram: false,
          twitter: false,
          youtube: false,
        },
        sessionId,
      });
    }
  };

  const skipSocialConnect = () => {
    const teams = searchParams?.get("teamEmails");
    const emails =
      teamEmails.length > 0
        ? teamEmails
        : teams?.split(",").map((email) => email.trim()) || [];
    const types =
      userType || (searchParams?.get("userType") as "solo" | "team");
    const organizationName =
      types === "team"
        ? orgName || (searchParams?.get("orgName") as string)
        : undefined;

    completeOnboarding.mutate({
      userType: types!,
      teamName: organizationName,
      teamEmails: types === "team" ? emails : undefined,
      pagesData: [],
      socialAccounts: {
        facebook: false,
        instagram: false,
        twitter: false,
        youtube: false,
      },
      sessionId,
    });
  };

  const isAccountConnected = (platform: string) => {
    const pagesData = temporaryData;
    return pagesData?.some(
      (account: { platform: string }) => account.platform === platform
    );
  };

  return {
    step,
    userType,
    orgName,
    logo,
    logoPreview,
    teamEmails,
    currentEmail,
    completeOnboarding,
    pagesData: temporaryData,
    isRemovingAccount,
    errorMessage,
    handleUserTypeSelect,
    handleLogoUpload,
    handleAddTeamEmail,
    removeEmail,
    handleSocialToggle,
    handleSocialRemove,
    handleBack,
    handleNext,
    skipSocialConnect,
    isAccountConnected,
    setOrgName,
    setCurrentEmail,
    filterAccountData,
  };
};
