import React from "react";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

interface UserTypeStepProps {
  userType: "solo" | "team" | null;
  onUserTypeSelect: (type: "solo" | "team") => void;
}

export const UserTypeStep: React.FC<UserTypeStepProps> = ({
  userType,
  onUserTypeSelect,
}) => {
  return (
    <>
      <h1 className="text-2xl font-bold mb-2">
        🧭 Langkah 1: Cara Kamu Menggunakan Sociofly
      </h1>
      <p className="text-gray-600 mb-8">
        Bagaimana kamu ingin menggunakan Sociofly?
      </p>

      <div className="space-y-4 mb-8">
        <Card
          className={`p-4 border-2 transition-all cursor-pointer ${
            userType === "solo"
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onUserTypeSelect("solo")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-lg">
                👤
              </div>
              <div>
                <h3 className="font-medium">Saya sendiri (Solo)</h3>
                <p className="text-sm text-gray-500">
                  Kelola akun media sosial pribadi tanpa tim.
                </p>
              </div>
            </div>
            <div
              className={`h-6 w-6 rounded-full border-2 flex items-center justify-center ${
                userType === "solo"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300"
              }`}
            >
              {userType === "solo" && <Check className="h-4 w-4" />}
            </div>
          </div>
        </Card>

        <Card
          className={`p-4 border-2 transition-all cursor-pointer ${
            userType === "team"
              ? "border-primary bg-primary/5"
              : "border-gray-200 hover:border-gray-300"
          }`}
          onClick={() => onUserTypeSelect("team")}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                  👥
                </div>
              </div>
              <div>
                <h3 className="font-medium">
                  Bersama tim atau klien (Tim/Organisasi)
                </h3>
                <p className="text-sm text-gray-500">
                  Bekerja sama dengan tim atau klien untuk menjadwalkan dan
                  mengelola konten.
                </p>
              </div>
            </div>
            <div
              className={`h-6 w-6 rounded-full border-2 flex-none flex items-center justify-center ${
                userType === "team"
                  ? "border-primary bg-primary text-white"
                  : "border-gray-300"
              }`}
            >
              {userType === "team" && <Check className="h-4 w-4" />}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
};
