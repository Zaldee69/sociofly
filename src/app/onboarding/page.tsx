"use client";
import React, { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowLeft, Instagram, Facebook } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserTypeStep } from "./components/user-type-step";
import { TeamStep } from "./components/team-step";
import { SocialAccountsStep } from "./components/social-account-step";
import { AccountSelectionDialog } from "./components/account-selection-dialog";
import { useOnboarding } from "./hooks/use-onboarding";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const Onboarding: React.FC = () => {
  const searchParams = useSearchParams();
  const refresh = searchParams.get("refresh");
  const [isAccountSelectionOpen, setIsAccountSelectionOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);

  const {
    step,
    userType,
    orgName,
    logo,
    logoPreview,
    teamEmails,
    currentEmail,
    completeOnboarding,
    pagesData,
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
  } = useOnboarding();

  const handleRefresh = useCallback(() => {
    if (refresh === "true") {
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("refresh");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [refresh]);

  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // Update selectedAccount when pagesData changes to a single account
  useEffect(() => {
    if (
      Array.isArray(pagesData) &&
      pagesData.length === 1 &&
      !selectedAccount
    ) {
      setSelectedAccount(pagesData[0]);
    }
  }, [pagesData, selectedAccount]);

  const handleCompleteOnboarding = () => {
    // Check if user has multiple pages connected and hasn't selected one yet
    // If we've already filtered down to a single account, we can proceed
    const hasMultipleAccounts =
      Array.isArray(pagesData) && pagesData.length > 1;
    const needsSelection = hasMultipleAccounts && !selectedAccount;

    if (needsSelection) {
      setIsAccountSelectionOpen(true);
      return;
    }

    // If only one account (either originally or after filtering), proceed with onboarding completion
    handleNext(selectedAccount);
  };

  const handleAccountSelect = (account: any) => {
    setSelectedAccount(account);
    setIsAccountSelectionOpen(false);
    // Filter data to keep only the selected account
    filterAccountData(account);
    // Update UI state
    toast.success(`Akun ${account.name} berhasil dipilih`);
  };

  const renderStep = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="w-full"
        >
          {step === 1 && (
            <UserTypeStep
              userType={userType ?? null}
              onUserTypeSelect={handleUserTypeSelect}
            />
          )}
          {step === 2 && (
            <TeamStep
              teamName={orgName}
              onTeamNameChange={setOrgName}
              logo={logo}
              logoPreview={logoPreview}
              onLogoUpload={handleLogoUpload}
              teamEmails={teamEmails}
              currentEmail={currentEmail}
              onCurrentEmailChange={setCurrentEmail}
              onAddTeamEmail={handleAddTeamEmail}
              onRemoveEmail={removeEmail}
            />
          )}
          {step === 3 && (
            <SocialAccountsStep
              isAccountConnected={(platform: string) =>
                isAccountConnected(platform) ?? false
              }
              onSocialToggle={handleSocialToggle}
              onSocialRemove={handleSocialRemove}
              isRemoving={isRemovingAccount}
              userType={userType}
              errorMessage={errorMessage}
            />
          )}
        </motion.div>
      </AnimatePresence>
    );
  };

  const renderActionButtons = () => {
    const accounts = pagesData?.map((account: any) => account.platform);
    const hasMultipleAccounts =
      Array.isArray(pagesData) && pagesData.length > 1;
    const hasSelectedAccount = !!selectedAccount;

    // Check if we've filtered down to a single account
    const isSingleAccount = Array.isArray(pagesData) && pagesData.length === 1;

    // Determine button text
    const getButtonText = () => {
      if (completeOnboarding.isPending) return "Memproses...";

      if (hasMultipleAccounts && !hasSelectedAccount && !isSingleAccount) {
        return "Pilih Akun";
      }

      if (selectedAccount || isSingleAccount) {
        const accountName =
          selectedAccount?.name || (pagesData && pagesData[0]?.name);
        return `Lanjutkan dengan ${accountName || "akun terpilih"}`;
      }

      return "Masuk ke Dashboard";
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        {step === 3 ? (
          <div className="flex space-x-4">
            {(!accounts || accounts.length === 0) && (
              <Button
                variant="outline"
                onClick={skipSocialConnect}
                disabled={completeOnboarding.isPending}
              >
                Lewati
              </Button>
            )}
            {accounts && accounts.length > 0 && (
              <Button
                onClick={handleCompleteOnboarding}
                disabled={completeOnboarding.isPending}
                className="min-w-[200px]"
              >
                {getButtonText()}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex space-x-4 w-full">
            <Button
              onClick={handleNext}
              disabled={
                completeOnboarding.isPending || (step === 1 && !userType)
              }
              className={step > 1 ? "flex-1" : "w-full"}
            >
              {completeOnboarding.isPending ? "Memproses..." : "Lanjutkan"}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  const renderStepIndicator = () => {
    const totalSteps = userType === "team" ? 3 : 2;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className={cn(
          "grid gap-2 mb-8 mt-16 w-full justify-center",
          userType === "team" ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2, delay: idx * 0.1 }}
            className={`h-2 w-full rounded-full ${
              idx + 1 <= step ? "bg-primary" : "bg-gray-200"
            }`}
          />
        ))}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex max-w-screen-xl mx-auto"
    >
      <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 flex gap-2 items-center"
        >
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center justify-start w-fit mb-4 hover:bg-transparent group"
            disabled={completeOnboarding.isPending}
          >
            <ArrowLeft
              className={cn("mr-2 h-4 w-4 group-hover:text-primary", {
                hidden: step === 1,
              })}
            />
            <div
              className={cn(
                "h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg relative transition-opacity duration-300",
                {
                  "group-hover:opacity-0": step !== 1,
                }
              )}
            ></div>
            <span
              className={cn(
                "absolute text-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-8",
                {
                  hidden: step === 1,
                }
              )}
            >
              Kembali
            </span>
          </Button>
        </motion.div>

        {step !== 1 && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          ></motion.div>
        )}

        <div className="flex-1 space-y-4">
          {renderStep()}
          {renderActionButtons()}
        </div>
        {renderStepIndicator()}
      </div>

      {/* Account selection dialog */}
      <AccountSelectionDialog
        isOpen={isAccountSelectionOpen}
        onClose={() => setIsAccountSelectionOpen(false)}
        accounts={pagesData || []}
        onSelectAccount={handleAccountSelect}
      />

      {/* Testimonial section */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="hidden md:flex md:w-1/2 bg-gray-50 p-10 flex-col"
      >
        <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto">
          <div className="mb-8">
            <p className="text-2xl font-medium mb-6">
              Mengotomatisasi jadwal postingan media sosial membuat hidup saya
              lebih mudah dan efisien.
            </p>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">— Budi Santoso</p>
                <p className="text-gray-500 text-sm">
                  Founder, DigiKreasi Indonesia
                </p>
              </div>

              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-5 h-5 text-yellow-400 fill-yellow-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                      clipRule="evenodd"
                    />
                  </svg>
                ))}
              </div>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden shadow-lg">
            <div className="border-b p-4 bg-white">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-gradient-to-br from-purple-500 to-pink-500 rounded-md"></div>
                <span className="font-medium">Sociofly</span>
              </div>
            </div>

            <div className="bg-white p-4">
              <div className="border-b pb-4">
                <h3 className="text-lg font-medium mb-2">
                  Integrasi dengan platform sosial media
                </h3>
                <p className="text-sm text-gray-500">
                  Tingkatkan produktivitas tim dengan mengintegrasikan platform
                  yang kamu gunakan setiap hari.
                </p>
              </div>

              <div className="pt-3">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-pink-100 rounded-md flex items-center justify-center">
                    <Instagram className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">Instagram</p>
                    <p className="text-xs text-gray-500">
                      Jadwalkan dan publikasikan konten di Instagram secara
                      otomatis.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-md flex items-center justify-center">
                    <Facebook className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Facebook</p>
                    <p className="text-xs text-gray-500">
                      Kelola halaman bisnis Facebook dan jadwalkan konten dengan
                      mudah.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Onboarding;
