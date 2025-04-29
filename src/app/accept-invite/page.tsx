"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "error" | "success">(
    "loading"
  );
  const [error, setError] = useState("");

  useEffect(() => {
    async function processInvitation() {
      if (!token) {
        setStatus("error");
        setError("Token undangan tidak ditemukan");
        return;
      }

      try {
        const response = await fetch("/api/team/invite/accept", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401 && data.redirectTo) {
            router.push(data.redirectTo);
            return;
          }
          setStatus("error");
          setError(data.error || "Terjadi kesalahan saat memproses undangan");
          return;
        }

        setStatus("success");
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (error) {
        console.error("Error processing invitation:", error);
        setStatus("error");
        setError("Terjadi kesalahan saat memproses undangan");
      }
    }

    processInvitation();
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        {status === "loading" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">Memproses Undangan</h2>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Kembali ke Beranda
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-green-600 mb-4">
              Berhasil!
            </h2>
            <p className="text-gray-600">
              Anda telah berhasil bergabung dengan tim.
            </p>
            <p className="text-gray-600 mt-2">Mengalihkan ke dashboard...</p>
          </div>
        )}
      </div>
    </div>
  );
}
