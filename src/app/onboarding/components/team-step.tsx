import React from "react";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { toast } from "sonner";

interface TeamStepProps {
  teamName: string;
  onTeamNameChange: (name: string) => void;
  logo: File | null;
  logoPreview: string | null;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  teamEmails: string[];
  currentEmail: string;
  onCurrentEmailChange: (email: string) => void;
  onAddTeamEmail: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onRemoveEmail: (email: string) => void;
}

export const TeamStep: React.FC<TeamStepProps> = ({
  teamName,
  onTeamNameChange,
  logo,
  logoPreview,
  onLogoUpload,
  teamEmails,
  currentEmail,
  onCurrentEmailChange,
  onAddTeamEmail,
  onRemoveEmail,
}) => {
  return (
    <>
      <h1 className="text-2xl font-bold mb-2">🧾 Langkah 1: Detail Team</h1>
      <p className="text-gray-600 mb-8">Buat tim kamu</p>

      <div className="space-y-6 mb-8">
        <div>
          <label
            htmlFor="teamName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nama tim
          </label>
          <Input
            id="teamName"
            placeholder="Contoh: PT Digital Kreatif"
            value={teamName}
            onChange={(e) => onTeamNameChange(e.target.value)}
            className="w-full"
          />
        </div>

        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Upload logo (opsional)
          </label>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg w-24 h-24 hover:border-gray-400 transition-colors">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Upload className="h-8 w-8 text-gray-400" />
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                onChange={onLogoUpload}
              />
            </label>
            <div className="text-sm text-gray-500">
              Gunakan logo agar tim kamu mudah mengenali.
            </div>
          </div>
        </div> */}

        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ingin mengundang anggota sekarang? (opsional)
          </label>
          <Input
            placeholder="Masukkan email dan tekan Enter"
            value={currentEmail}
            onChange={(e) => onCurrentEmailChange(e.target.value)}
            onKeyDown={onAddTeamEmail}
            className="w-full mb-2"
          />
          {teamEmails.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teamEmails.map((email) => (
                <div
                  key={email}
                  className="flex items-center bg-primary/10 text-primary rounded px-2 py-1 text-sm"
                >
                  <span className="mr-1">📧</span>
                  {email}
                  <button
                    className="ml-2 text-gray-500 hover:text-gray-700"
                    onClick={() => onRemoveEmail(email)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div> */}
      </div>
    </>
  );
};

// Export OrganizationStep as an alias for TeamStep for backward compatibility
export const OrganizationStep = TeamStep;
