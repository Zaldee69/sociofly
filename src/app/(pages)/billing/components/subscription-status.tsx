import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CreditCard,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

const SubscriptionStatus = () => {
  // Mock subscription data - in real app this would come from your auth/subscription context
  const [subscriptionData, setSubscriptionData] = useState({
    isSubscribed: true,
    plan: "Premium",
    status: "active",
    nextBilling: "2025-01-30",
    amount: "$29.00",
    paymentMethod: "**** 4242",
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshStatus = async () => {
    setIsRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false);
      console.log("Subscription status refreshed");
    }, 1500);
  };

  const handleManageSubscription = () => {
    console.log("Opening subscription management portal");
    // In real app, this would redirect to Stripe customer portal
  };

  if (!subscriptionData.isSubscribed) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-200 bg-orange-50">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-orange-100 w-fit">
            <XCircle className="w-8 h-8 text-orange-600" />
          </div>
          <CardTitle className="text-xl text-orange-800">
            No Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-orange-700 mb-6">
            Choose a plan below to unlock premium features and get the most out
            of your experience.
          </p>
          <Button className="bg-orange-600 hover:bg-orange-700">
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto border-green-200 bg-green-50">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 rounded-full bg-green-100 w-fit">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-xl text-green-800">
          Your Subscription
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Plan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Current Plan
              </span>
              <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                {subscriptionData.plan}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Status</span>
              <Badge
                className={`${
                  subscriptionData.status === "active"
                    ? "bg-green-100 text-green-800 border-green-200"
                    : "bg-red-100 text-red-800 border-red-200"
                }`}
              >
                {subscriptionData.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">Amount</span>
              <span className="font-semibold">
                {subscriptionData.amount}/month
              </span>
            </div>
          </div>

          {/* Billing Info */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Next Billing
              </span>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm">{subscriptionData.nextBilling}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">
                Payment Method
              </span>
              <div className="flex items-center">
                <CreditCard className="w-4 h-4 text-slate-500 mr-2" />
                <span className="text-sm">
                  {subscriptionData.paymentMethod}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            onClick={handleManageSubscription}
            className="flex-1 bg-slate-900 hover:bg-slate-800"
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>

          <Button
            onClick={handleRefreshStatus}
            variant="outline"
            disabled={isRefreshing}
            className="flex-1"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh Status"}
          </Button>
        </div>

        {/* Features Included */}
        <div className="mt-8 p-4 bg-white rounded-lg border border-green-200">
          <h4 className="font-semibold text-green-800 mb-3">
            Your Plan Includes:
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm text-green-700">
            <div>✓ Unlimited projects</div>
            <div>✓ Premium templates</div>
            <div>✓ Priority support</div>
            <div>✓ 100GB storage</div>
            <div>✓ Advanced analytics</div>
            <div>✓ Team collaboration</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionStatus;
