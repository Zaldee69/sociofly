"use client";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Check,
  ChevronRight,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Upload,
  ArrowLeft,
  AlertCircle,
  Linkedin,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
const Onboarding: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const router = useRouter();

  const authUser = useUser();

  console.log(authUser.user?.id);

  // User selection state
  const [userType, setUserType] = useState<"solo" | "team" | null>(null);

  // Organization details state (Step 2)
  const [orgName, setOrgName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");

  // Social media accounts state (Step 3)
  const [socialAccounts, setSocialAccounts] = useState({
    instagram: false,
    facebook: false,
    twitter: false,
    youtube: false,
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const step = urlParams.get("step");
    if (step === "add_social_accounts") {
      setStep(3);
    }
  }, []);

  // tRPC mutation for completing onboarding
  const completeOnboarding = trpc.onboarding.completeOnboarding.useMutation({
    onSuccess: () => {
      toast.success("Onboarding berhasil diselesaikan!");
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error("Oops!", {
        description:
          error.message || "Terjadi kesalahan saat menyelesaikan onboarding",
      });
    },
  });

  const handleUserTypeSelect = (type: "solo" | "team") => {
    setUserType(type);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);

      // Create preview URL
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

  const handleSocialToggle = (platform: keyof typeof socialAccounts) => {
    if (platform !== "twitter") {
      setSocialAccounts({
        ...socialAccounts,
        [platform]: !socialAccounts[platform],
      });
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(userType === "team" ? 2 : 1);
    } else if (step === 2) {
      setStep(1);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!userType) {
        toast.error("Pilih salah satu opsi");
        return;
      }
      setStep(userType === "team" ? 2 : 3);
    } else if (step === 2) {
      if (!orgName.trim()) {
        toast.error("Nama organisasi diperlukan");
        return;
      }
      setStep(3);
    } else {
      // Complete onboarding
      completeOnboarding.mutate({
        userType: userType!,
        organizationName: userType === "team" ? orgName : undefined,
        teamEmails: userType === "team" ? teamEmails : undefined,
        socialAccounts,
      });
    }
  };

  const skipSocialConnect = () => {
    completeOnboarding.mutate({
      userType: userType!,
      organizationName: userType === "team" ? orgName : undefined,
      teamEmails: userType === "team" ? teamEmails : undefined,
    });
  };

  const renderStep = () => {
    switch (step) {
      case 1:
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
                onClick={() => handleUserTypeSelect("solo")}
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
                onClick={() => handleUserTypeSelect("team")}
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
                        Bekerja sama dengan tim atau klien untuk menjadwalkan
                        dan mengelola konten.
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

      case 2:
        return (
          <>
            <h1 className="text-2xl font-bold mb-2">
              🧾 Langkah 2: Detail Organisasi
            </h1>
            <p className="text-gray-600 mb-8">Buat organisasi kamu</p>

            <div className="space-y-6 mb-8">
              <div>
                <label
                  htmlFor="orgName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Nama organisasi
                </label>
                <Input
                  id="orgName"
                  placeholder="Contoh: PT Digital Kreatif"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
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
                      onChange={handleLogoUpload}
                    />
                  </label>
                  <div className="text-sm text-gray-500">
                    Gunakan logo agar tim kamu mudah mengenali.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ingin mengundang anggota sekarang? (opsional)
                </label>
                <Input
                  placeholder="Masukkan email dan tekan Enter"
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  onKeyDown={handleAddTeamEmail}
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
                          onClick={() => removeEmail(email)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        );

      case 3:
        return (
          <>
            <h1 className="text-2xl font-bold mb-2">
              🔗 Langkah 3: Hubungkan Akun Sosial Media
            </h1>
            <p className="text-gray-600 mb-8">
              Platform apa yang ingin kamu kelola dengan Sociofly?
            </p>

            <Alert
              variant="default"
              className="mb-4 border-amber-200 bg-amber-50"
            >
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

            <div className="space-y-4 mb-8">
              <button
                className={`flex items-center w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300`}
                onClick={() => handleSocialToggle("instagram")}
              >
                <Instagram className="h-6 w-6 mr-3 text-pink-600" />
                <span className="flex-1 text-left font-medium">
                  Hubungkan Instagram
                </span>
                <div className={`text-sm text-yellow-600 mr-2`}>Hubungkan</div>
              </button>

              <div
                className={`flex items-center w-full p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300`}
              >
                <Facebook className="h-6 w-6 mr-3 text-blue-600" />
                <span className="flex-1 text-left font-medium">Facebook</span>
                <a
                  href={`https://www.facebook.com/v21.0/dialog/oauth?client_id=${process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID}&state=${authUser.user?.id}&redirect_uri=${encodeURIComponent(
                    `${window.location.origin}/api/auth/callback/facebook`
                  )}&scope=email,business_management,pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_cta,pages_manage_engagement,pages_manage_metadata,pages_manage_posts,pages_read_engagement,pages_read_user_content,pages_manage_posts,pages_manage_cta,pages_manage_engagement,pages_manage_metadata`}
                  className={`text-sm text-yellow-600 mr-2`}
                >
                  Hubungkan
                </a>
              </div>

              <button className="flex items-center w-full p-4 rounded-lg border-2 border-gray-200 bg-gray-50 cursor-not-allowed opacity-70">
                <div className="h-6 w-6 mr-3 text-black flex items-center justify-center font-bold text-lg">
                  Tt
                </div>
                <span className="flex-1 text-left font-medium">
                  Hubungkan TikTok
                </span>
                <span className="text-sm text-yellow-600 mr-2">
                  Segera tersedia
                </span>
              </button>

              <button className="flex items-center w-full p-4 rounded-lg border-2 border-gray-200 bg-gray-50 cursor-not-allowed opacity-70">
                <div className="h-6 w-6 mr-3 text-black flex items-center justify-center font-bold text-lg">
                  <Linkedin className="h-6 w-6 text-blue-600" />
                </div>
                <span className="flex-1 text-left font-medium">
                  Hubungkan LinkedIn
                </span>
                <span className="text-sm text-yellow-600 mr-2">
                  Segera tersedia
                </span>
              </button>

              <button className="flex items-center w-full p-4 rounded-lg border-2 border-gray-200 bg-gray-50 cursor-not-allowed opacity-70">
                <div className="h-6 w-6 mr-3 text-black flex items-center justify-center font-bold text-lg">
                  <Twitter className="h-6 w-6 text-blue-600" />
                </div>
                <span className="flex-1 text-left font-medium">
                  Hubungkan Twitter
                </span>
                <span className="text-sm text-yellow-600 mr-2">
                  Segera tersedia
                </span>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-8">
              Kamu juga bisa menambahkan atau mengubah akun sosial media nanti
              di dashboard.
            </p>
          </>
        );

      default:
        return null;
    }
  };

  const renderActionButtons = () => {
    if (step === 3) {
      return (
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={skipSocialConnect}
            disabled={completeOnboarding.isPending}
          >
            Lewati
          </Button>
          <Button onClick={handleNext} disabled={completeOnboarding.isPending}>
            {completeOnboarding.isPending
              ? "Memproses..."
              : "Masuk ke Dashboard"}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <div className="flex space-x-4 w-full">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center"
            disabled={completeOnboarding.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={completeOnboarding.isPending || (step === 1 && !userType)}
          className={step > 1 ? "flex-1" : "w-full"}
        >
          {completeOnboarding.isPending ? "Memproses..." : "Lanjutkan"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  };

  const renderStepIndicator = () => {
    const totalSteps = userType === "team" ? 3 : 2;
    return (
      <div
        className={cn(
          "grid  gap-2 mb-8 mt-16 w-full justify-center",
          userType === "team" ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <div
            key={idx}
            className={`h-2 w-full rounded-full ${
              idx + 1 <= step ? "bg-primary" : "bg-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex max-w-screen-xl mx-auto">
      {/* Left side - Onboarding form */}
      <div className="w-full md:w-1/2 p-6 md:p-10 flex flex-col">
        {/* Logo placeholder */}
        <div className="mb-10 flex gap-2 items-center">
          <div className="h-12 w-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg"></div>
          <h1 className="text-2xl font-bold">Sociofly</h1>
        </div>
        {step !== 1 && (
          <Button
            variant="ghost"
            onClick={handleBack}
            className="flex items-center justify-start w-fit mb-4"
            disabled={completeOnboarding.isPending}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        )}

        <div className="flex-1 space-y-4">
          {renderStep()}

          {/* Action buttons */}
          {renderActionButtons()}
        </div>
        {renderStepIndicator()}
      </div>

      {/* Right side - Testimonial (only visible on medium screens and above) */}
      <div className="hidden md:flex md:w-1/2 bg-gray-50 p-10 flex-col">
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
      </div>
    </div>
  );
};

export default Onboarding;
