import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CreditCard,
  Settings,
  RefreshCw,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { formatDate } from "@/lib/utils/date";
import { api } from "@/lib/utils/api";
import { SUBSCRIPTION_PRICES, PLAN_DISPLAY_NAMES } from "@/config/constants";

// Define plan types
type PlanType = "FREE" | "PRO" | "ENTERPRISE";

const planPrices: Record<string, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  PRO: {
    monthly: SUBSCRIPTION_PRICES.PRO,
    yearly: Math.round(SUBSCRIPTION_PRICES.PRO * 12 * 0.8),
  },
  ENTERPRISE: {
    monthly: SUBSCRIPTION_PRICES.ENTERPRISE,
    yearly: Math.round(SUBSCRIPTION_PRICES.ENTERPRISE * 12 * 0.8),
  },
};

const SubscriptionStatus = () => {
  const router = useRouter();
  const { isLoaded } = useUser();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch user subscription data
  const { data: userData, refetch } = api.user.getSubscriptionDetails.useQuery(
    undefined,
    { enabled: isLoaded }
  );

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const handleManageSubscription = () => {
    router.push("/billing#pricing");
  };

  // Loading state
  if (!isLoaded || !userData) {
    return (
      <Card className="bg-white border border-slate-200 overflow-hidden animate-pulse">
        <CardHeader className="relative z-10 pb-2">
          <div className="h-6 bg-slate-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 rounded w-2/3"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-4 bg-slate-200 rounded w-3/4"></div>
              <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            </div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              <div className="h-6 bg-slate-200 rounded w-1/3"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSubscribed =
    userData.subscriptionActive && userData.subscriptionPlan !== "FREE";
  const plan = userData.subscriptionPlan || "FREE";
  const expiresAt = userData.subscriptionExpiresAt;
  const billingCycle = userData.lastTransaction?.billingCycle || "MONTHLY";

  // Calculate amount based on plan and billing cycle
  const planPrice = planPrices[plan] || planPrices.FREE;
  const amount =
    billingCycle === "YEARLY" ? planPrice.yearly : planPrice.monthly;

  if (!isSubscribed) {
    return (
      <Card className="bg-white border border-orange-200 overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-orange-50 to-transparent" />
        <CardHeader className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-100">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <CardTitle className="text-lg text-orange-800">
              No Active Subscription
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <p className="text-orange-700 mb-6">
            Choose a plan below to unlock premium features and get the most out
            of your experience.
          </p>
          <Button
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleManageSubscription}
          >
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Get plan display name
  const planName =
    PLAN_DISPLAY_NAMES[plan as keyof typeof PLAN_DISPLAY_NAMES] ||
    "Unknown Plan";

  return (
    <Card className="bg-white border border-indigo-100 overflow-hidden">
      <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-indigo-50 to-transparent" />
      <CardHeader className="relative z-10 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-indigo-100">
              <Shield className="w-5 h-5 text-indigo-600" />
            </div>
            <CardTitle className="text-lg">Your Subscription</CardTitle>
          </div>
          <Badge className="bg-green-100 text-green-800 border-green-200">
            ACTIVE
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Current Plan */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-slate-500">Current Plan</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-indigo-700">
                {planName}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              {plan === "PRO"
                ? "Access to all premium features"
                : plan === "ENTERPRISE"
                  ? "Enterprise-level access and support"
                  : "Basic access to features"}
            </p>
          </div>

          {/* Billing Info */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-slate-500">Billing Info</h3>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span>
                  Expires: {expiresAt ? formatDate(expiresAt) : "N/A"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-slate-400" />
                <span>
                  Billing: {billingCycle === "YEARLY" ? "Yearly" : "Monthly"}
                </span>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm text-slate-500">Amount</h3>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold">
                Rp {amount.toLocaleString("id-ID")}
              </span>
              <span className="text-slate-500">
                /{billingCycle === "YEARLY" ? "year" : "month"}
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleManageSubscription}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>

          <Button
            onClick={handleRefreshStatus}
            variant="outline"
            disabled={isRefreshing}
            className="flex-1 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
