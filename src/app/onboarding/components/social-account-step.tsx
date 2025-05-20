import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  InstagramIcon,
  FacebookIcon,
  TikTokIcon,
  LinkedInIcon,
  TwitterIcon,
} from "@/components/icons/social-media-icons";

interface SocialAccountsStepProps {
  isAccountConnected: (platform: string) => boolean;
  onSocialToggle: (platform: "FACEBOOK" | "INSTAGRAM") => void;
  onSocialRemove?: (platform: "FACEBOOK" | "INSTAGRAM") => void;
  userType?: "solo" | "team" | null;
  isRemoving?: boolean;
}

export const SocialAccountsStep: React.FC<SocialAccountsStepProps> = ({
  isAccountConnected,
  onSocialToggle,
  onSocialRemove,
  userType,
  isRemoving = false,
}) => {
  const stepNumber = userType === "team" ? 3 : 2;

  // Check if any social account is already connected
  const hasAnyAccountConnected =
    isAccountConnected("FACEBOOK") || isAccountConnected("INSTAGRAM");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">
          🔗 Langkah {stepNumber}: Hubungkan Akun Sosial Media
        </h2>
        <p className="text-gray-500">
          Hubungkan akun sosial media Anda untuk mulai mengelola konten
        </p>
      </div>

      <Alert variant="default" className="mb-4 border-amber-200 bg-amber-50">
        <AlertTitle className="text-amber-800 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          Persyaratan akun
        </AlertTitle>
        <AlertDescription className="text-amber-700 text-sm">
          <p className="mb-2">
            Sociofly hanya mendukung akun dengan kriteria berikut:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Facebook Page yang terhubung ke Business Manager</li>
            <li>
              Akun Instagram Business atau Creator yang telah dikaitkan ke
              Facebook Page
            </li>
            <li>Akun memiliki hak admin atau editor pada Page</li>
          </ul>
          <p className="mt-2">
            Akun personal tidak dapat digunakan untuk pengelolaan konten
            terjadwal atau penarikan data analitik.
          </p>
        </AlertDescription>
      </Alert>

      {hasAnyAccountConnected && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <AlertTitle className="text-green-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-green-600" />
            Akun sudah terhubung
          </AlertTitle>
          <AlertDescription className="text-green-700 text-sm">
            Anda sudah menghubungkan akun sosial media. Untuk saat ini, Anda
            hanya dapat menghubungkan satu akun pada tahap onboarding. Anda
            dapat menambahkan akun lain setelah masuk ke dashboard.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative">
            <Button
              variant="outline"
              className={`w-full h-auto p-4 flex items-center justify-between ${
                hasAnyAccountConnected && !isAccountConnected("INSTAGRAM")
                  ? "opacity-70"
                  : ""
              }`}
              onClick={() =>
                !isAccountConnected("INSTAGRAM") &&
                !hasAnyAccountConnected &&
                onSocialToggle("INSTAGRAM")
              }
              disabled={
                hasAnyAccountConnected && !isAccountConnected("INSTAGRAM")
              }
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-pink-100 rounded-md flex items-center justify-center">
                  <InstagramIcon className="text-pink-600" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Instagram</p>
                  <p className="text-xs text-gray-500">
                    {isAccountConnected("INSTAGRAM")
                      ? "Terhubung"
                      : hasAnyAccountConnected
                        ? "Tambahkan setelah onboarding"
                        : "Hubungkan akun Instagram Anda"}
                  </p>
                </div>
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  isAccountConnected("INSTAGRAM")
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              />
            </Button>

            {isAccountConnected("INSTAGRAM") && onSocialRemove && (
              <motion.button
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-full"
                onClick={() => onSocialRemove("INSTAGRAM")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isRemoving}
              >
                <Trash size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative">
            <Button
              variant="outline"
              className={`w-full h-auto p-4 flex items-center justify-between ${
                hasAnyAccountConnected && !isAccountConnected("FACEBOOK")
                  ? "opacity-70"
                  : ""
              }`}
              onClick={() =>
                !isAccountConnected("FACEBOOK") &&
                !hasAnyAccountConnected &&
                onSocialToggle("FACEBOOK")
              }
              disabled={
                hasAnyAccountConnected && !isAccountConnected("FACEBOOK")
              }
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-[#1877F2] rounded-md flex items-center justify-center">
                  <FacebookIcon className="text-white" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Facebook</p>
                  <p className="text-xs text-gray-500">
                    {isAccountConnected("FACEBOOK")
                      ? "Terhubung"
                      : hasAnyAccountConnected
                        ? "Tambahkan setelah onboarding"
                        : "Hubungkan akun Facebook Anda"}
                  </p>
                </div>
              </div>
              <div
                className={`h-2 w-2 rounded-full ${
                  isAccountConnected("FACEBOOK")
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              />
            </Button>

            {isAccountConnected("FACEBOOK") && onSocialRemove && (
              <motion.button
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-full"
                onClick={() => onSocialRemove("FACEBOOK")}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isRemoving}
              >
                <Trash size={16} />
              </motion.button>
            )}
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Button
          variant="outline"
          className="w-full h-auto p-4 flex items-center justify-between opacity-70"
          disabled
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-black rounded-md flex items-center justify-center">
              <TikTokIcon className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium">TikTok</p>
              <p className="text-xs text-gray-500">Segera tersedia</p>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <Button
          variant="outline"
          className="w-full h-auto p-4 flex items-center justify-between opacity-70"
          disabled
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-[#0077B7] rounded-md flex items-center justify-center">
              <LinkedInIcon className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium">LinkedIn</p>
              <p className="text-xs text-gray-500">Segera tersedia</p>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
      >
        <Button
          variant="outline"
          className="w-full h-auto p-4 flex items-center justify-between opacity-70"
          disabled
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-black rounded-md flex items-center justify-center">
              <TwitterIcon className="text-white" />
            </div>
            <div className="text-left">
              <p className="font-medium">X (Twitter)</p>
              <p className="text-xs text-gray-500">Segera tersedia</p>
            </div>
          </div>
          <div className="h-2 w-2 rounded-full bg-gray-300" />
        </Button>
      </motion.div>

      <p className="text-sm text-gray-500 mb-8">
        {hasAnyAccountConnected
          ? "Anda dapat menambahkan lebih banyak akun sosial media di dashboard setelah onboarding selesai."
          : "Kamu juga bisa menambahkan atau mengubah akun sosial media nanti di dashboard."}
      </p>
    </div>
  );
};
