import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
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
  userType?: "solo" | "team" | null;
}

export const SocialAccountsStep: React.FC<SocialAccountsStepProps> = ({
  isAccountConnected,
  onSocialToggle,
  userType,
}) => {
  const stepNumber = userType === "team" ? 3 : 2;

  console.log(isAccountConnected("INSTAGRAM"));

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

      <div className="space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            className="w-full h-auto p-4 flex items-center justify-between"
            onClick={() =>
              !isAccountConnected("INSTAGRAM") && onSocialToggle("INSTAGRAM")
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
                    : "Hubungkan akun Instagram Anda"}
                </p>
              </div>
            </div>
            <div
              className={`h-2 w-2 rounded-full ${
                isAccountConnected("INSTAGRAM") ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            variant="outline"
            className="w-full h-auto p-4 flex items-center justify-between"
            onClick={() =>
              !isAccountConnected("FACEBOOK") && onSocialToggle("FACEBOOK")
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
                    : "Hubungkan akun Facebook Anda"}
                </p>
              </div>
            </div>
            <div
              className={`h-2 w-2 rounded-full ${
                isAccountConnected("FACEBOOK") ? "bg-green-500" : "bg-gray-300"
              }`}
            />
          </Button>
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
        Kamu juga bisa menambahkan atau mengubah akun sosial media nanti di
        dashboard.
      </p>
    </div>
  );
};
