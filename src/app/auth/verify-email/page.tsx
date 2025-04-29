"use client";

import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/utils/supabase/client";
import { toast } from "sonner";
import { Mail, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [isInitialCheck, setIsInitialCheck] = useState(true);
  const [emailState, setEmail] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email || "",
      });

      if (error) {
        if (error.message.includes("security purposes")) {
          // Extract the number of seconds from the error message
          const seconds = parseInt(error.message.match(/\d+/)?.[0] || "60");
          setCooldown(seconds);
          toast.error(
            `Please wait ${seconds} seconds before requesting another verification email.`
          );
        } else {
          throw error;
        }
        return;
      }

      setCooldown(60); // Set a 60-second cooldown after successful resend
      toast.success(
        "Verification email has been resent. Please check your inbox."
      );
    } catch (error) {
      console.error("Error resending verification:", error);
      toast.error("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const checkVerificationStatus = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error getting session:", sessionError);
        return;
      }

      if (!session) {
        // If no session, check if we have an email in the URL
        const searchParams = new URLSearchParams(window.location.search);
        const email = searchParams.get("email");

        if (email) {
          // If we have an email, we can still show the verification page
          setEmail(email);
          return;
        }

        // If no email and no session, redirect to login
        router.push("/auth/login");
        return;
      }

      // If we have a session, check if email is verified
      if (session.user.email_confirmed_at) {
        router.push("/dashboard");
        return;
      }

      setEmail(session.user.email || "");
    } catch (error) {
      console.error("Error checking verification status:", error);
      // Don't redirect on error, just show the verification page
    }
  };

  // Initial check and periodic checks
  useEffect(() => {
    const checkStatus = async () => {
      await checkVerificationStatus();
    };

    // Initial check
    checkStatus();

    // Set up periodic check
    const interval = setInterval(checkStatus, 5000);

    // Cleanup
    return () => {
      clearInterval(interval);
    };
  }, []);

  // If no email in URL, redirect to login
  useEffect(() => {
    if (!email) {
      router.push("/login");
    }
  }, [email, router]);

  if (!email) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <Mail className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-4">
            We've sent a verification email to{" "}
            <span className="font-semibold">{email}</span>
          </p>
          <p className="text-gray-600 mb-6">
            Please check your email and click the verification link to activate
            your account. The link will expire in 24 hours.
          </p>
          <div className="space-y-4">
            <Button
              onClick={handleResendVerification}
              disabled={isResending || cooldown > 0 || isVerified}
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Resending...
                </>
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                "Resend Verification Email"
              )}
            </Button>
            <Button
              onClick={checkVerificationStatus}
              disabled={isChecking || isVerified}
              variant="outline"
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "Check Verification Status"
              )}
            </Button>
            <Button
              onClick={() => router.push("/login")}
              variant="ghost"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
