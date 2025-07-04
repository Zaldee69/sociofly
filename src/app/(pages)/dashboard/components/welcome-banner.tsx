"use client";

import { Button } from "@/components/ui/button";
import { useUser } from "@clerk/nextjs";
import { ArrowRight, PartyPopper } from "lucide-react";
import Link from "next/link";

const WelcomeBanner = () => {
  const { user } = useUser();

  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-8 overflow-hidden">
      <div className="absolute -top-10 -right-10">
        <PartyPopper className="w-40 h-40 text-slate-100" />
      </div>
      <div className="relative z-10">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Welcome back, {user?.firstName || "User"}!
        </h2>
        <p className="text-slate-600 mb-6 max-w-md">
          Here's your snapshot of today's social media activity. Ready to make
          an impact?
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/schedule-post">
              Create New Post <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/analytics">View Analytics</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBanner;
