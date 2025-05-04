import { SignIn } from "@clerk/nextjs";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
  description: "Login to your account",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-primary hover:bg-primary/90 text-primary-foreground",
            card: "bg-card shadow-lg",
            headerTitle: "text-2xl font-bold text-card-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton:
              "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
            formFieldLabel: "text-card-foreground",
            formFieldInput:
              "bg-background border-input focus:border-primary focus:ring-primary",
            footerActionLink: "text-primary hover:text-primary/90",
          },
        }}
      />
    </div>
  );
}
