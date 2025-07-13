"use client";

import { Check, Shield, Zap, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SubscriptionStatus from "./components/subscription-status";
import { SubscriptionButton } from "@/components/payment/subscription-button";
import { BillingPlan } from "@/types/billing";
import { SUBSCRIPTION_PRICES, PLAN_DISPLAY_NAMES } from "@/config/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Clock, X } from "lucide-react";
import { api } from "@/lib/utils/api";
import PaymentHistory from "./components/payment-history";
import { PLAN_RANKS } from "@/config/feature-flags";

const pricingPlans = [
  {
    name: PLAN_DISPLAY_NAMES.FREE,
    plan: "FREE",
    price: SUBSCRIPTION_PRICES.FREE,
    formattedPrice: "Rp 0",
    period: "month",
    description: "Perfect for individuals getting started",
    features: [
      "Max 10 Posts per month",
      "Manage 2 Social Accounts",
      "Basic Post Analytics",
      "1 GB Media Storage",
      "Email Support",
    ],
    popular: false,
    icon: Globe,
    color: "slate",
  },
  {
    name: PLAN_DISPLAY_NAMES.PRO,
    plan: "PRO",
    price: SUBSCRIPTION_PRICES.PRO,
    formattedPrice: `Rp ${SUBSCRIPTION_PRICES.PRO.toLocaleString()}`,
    period: "month",
    description: "Best for growing teams and businesses",
    features: [
      "Unlimited Post Scheduling",
      "Connect up to 10 Social Accounts",
      "Advanced Analytics & Insights",
      "Team Collaboration & Role Management",
      "Basic Approval Workflows",
      "AI Content Assistant",
      "Unified Inbox",
      "100 GB Media Storage",
      "Priority Email Support",
    ],
    popular: true,
    icon: Zap,
    color: "indigo",
  },
  {
    name: PLAN_DISPLAY_NAMES.ENTERPRISE,
    plan: "ENTERPRISE",
    price: SUBSCRIPTION_PRICES.ENTERPRISE,
    formattedPrice: `Rp ${SUBSCRIPTION_PRICES.ENTERPRISE.toLocaleString()}`,
    period: "month",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Pro",
      "Unlimited Social Accounts & Teams",
      "Advanced Approval Workflows",
      "Dedicated Account Manager",
      "Custom Integrations & API Access",
      "Advanced Security & Compliance",
      "SLA Guarantee",
      "Custom Branding",
      "Unlimited Media Storage",
    ],
    popular: false,
    icon: Shield,
    color: "violet",
  },
];

// Yearly pricing calculation
const calculateYearlyPrice = (monthlyPrice: number) => {
  return monthlyPrice === 0 ? 0 : Math.round(monthlyPrice * 12 * 0.8);
};

// Component that handles search params (needs Suspense)
const PricingWithSearchParams = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [showAlert, setShowAlert] = useState(true);

  // Get user subscription data
  const { data: userData, isLoading } =
    api.user.getSubscriptionDetails.useQuery();
  const currentPlan = userData?.subscriptionPlan || "FREE";
  const isSubscriptionActive = userData?.subscriptionActive || false;

  // Check if a plan is the current plan or a downgrade
  const isPlanDisabled = (planName: string) => {
    if (!isSubscriptionActive) return false;

    // If it's the current plan, disable the button
    if (planName === currentPlan) return true;

    // Prevent downgrading from higher tier to lower tier
    const currentRank = PLAN_RANKS[currentPlan as keyof typeof PLAN_RANKS] || 0;
    const planRank = PLAN_RANKS[planName as keyof typeof PLAN_RANKS] || 0;

    return planRank < currentRank;
  };

  // Get button text based on plan status
  const getButtonText = (planName: string) => {
    if (planName === currentPlan) return "Current Plan";
    if (isPlanDisabled(planName)) return "Cannot Downgrade";
    return "Subscribe Now";
  };

  // Handle closing alert and removing URL parameters
  const handleCloseAlert = () => {
    setShowAlert(false);

    // Remove status and order_id parameters from URL
    if (searchParams?.has("status") || searchParams?.has("order_id")) {
      // Create URL without the parameters
      router.replace(pathname || "/billing", { scroll: false });
    }
  };

  useEffect(() => {
    const status = searchParams?.get("status");

    if (status) {
      setShowAlert(true); // Show alert when status parameter is present

      switch (status) {
        case "success":
          toast.success(
            "Payment successful! Your subscription has been updated."
          );
          break;
        case "pending":
          toast.info(
            "Payment is pending. We'll update your subscription once the payment is confirmed."
          );
          break;
        case "error":
          toast.error("Payment failed. Please try again or contact support.");
          break;
      }
    }
  }, [searchParams]);

  // Status alert banner
  const renderStatusAlert = () => {
    const status = searchParams?.get("status");

    if (!status || !showAlert) return null;

    switch (status) {
      case "success":
        return (
          <Alert className="mb-6 bg-green-50 border-green-200 pr-10 relative">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Payment Successful
            </AlertTitle>
            <AlertDescription className="text-green-700">
              Thank you for your payment. Your subscription has been updated.
            </AlertDescription>
            <div className="absolute z-[99] top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-green-700 hover:bg-green-100 hover:text-green-800"
                onClick={() => handleCloseAlert()}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </Alert>
        );
      case "pending":
        return (
          <Alert className="mb-6 bg-yellow-50 border-yellow-200 pr-10 relative">
            <Clock className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">Payment Pending</AlertTitle>
            <AlertDescription className="text-yellow-700">
              Your payment is being processed. We'll update your subscription
              once confirmed.
            </AlertDescription>
            <div className="absolute z-[99] top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-yellow-700 hover:bg-yellow-100 hover:text-yellow-800"
                onClick={() => handleCloseAlert()}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </Alert>
        );
      case "error":
        return (
          <Alert className="mb-6 bg-red-50 border-red-200 pr-10 relative">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertTitle className="text-red-800">Payment Failed</AlertTitle>
            <AlertDescription className="text-red-700">
              There was an issue with your payment. Please try again or contact
              support.
            </AlertDescription>
            <div className="absolute z-[99] top-2 right-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-red-700 hover:bg-red-100 hover:text-red-800"
                onClick={() => handleCloseAlert()}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </Alert>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <div className="container max-w-6xl mx-auto px-4 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
            Choose the Right Plan for Your Business
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Select the perfect plan to help your business grow and succeed
          </p>
        </div>

        {/* Status Alert */}
        {renderStatusAlert()}

        {/* Subscription Status */}
        <div className="mb-12">
          <SubscriptionStatus />
        </div>

        {/* Payment History */}
        <div className="mb-12">
          <PaymentHistory />
        </div>

        {/* Billing Cycle Tabs */}
        <Tabs defaultValue="monthly" className="w-full mb-8">
          <div className="flex justify-center">
            <TabsList className="grid w-[400px] grid-cols-2">
              <TabsTrigger value="monthly">Monthly Billing</TabsTrigger>
              <TabsTrigger value="yearly">
                Yearly Billing
                <Badge
                  variant="outline"
                  className="ml-2 bg-green-50 text-green-700 border-green-200"
                >
                  Save 20%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="monthly" className="mt-8">
            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => {
                const IconComponent = plan.icon;
                const isPopular = plan.popular;
                const isCurrentPlan = plan.plan === currentPlan;
                const isDisabled = isPlanDisabled(plan.plan);

                const colorClass = {
                  slate: "border-slate-200 hover:border-slate-300",
                  indigo: "border-indigo-200 hover:border-indigo-300",
                  violet: "border-violet-200 hover:border-violet-300",
                }[plan.color];

                const buttonClass = {
                  slate: isDisabled
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-700 hover:bg-slate-800",
                  indigo: isDisabled
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700",
                  violet: isDisabled
                    ? "bg-violet-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700",
                }[plan.color];

                const iconClass = {
                  slate: "bg-slate-100 text-slate-700",
                  indigo: "bg-indigo-100 text-indigo-700",
                  violet: "bg-violet-100 text-violet-700",
                }[plan.color];

                return (
                  <Card
                    key={index}
                    className={`relative h-full transition-all duration-300 ${
                      isCurrentPlan
                        ? "border-2 border-green-500 shadow-lg shadow-green-100"
                        : isPopular
                          ? "border-2 border-indigo-500 shadow-lg shadow-indigo-100"
                          : `border ${colorClass}`
                    }`}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-green-600 to-green-800 text-white px-3 py-1 text-xs font-medium">
                        CURRENT PLAN
                      </Badge>
                    )}

                    {!isCurrentPlan && isPopular && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-3 py-1 text-xs font-medium">
                        MOST POPULAR
                      </Badge>
                    )}

                    <CardHeader className="pb-6">
                      <div className={`p-3 rounded-lg w-fit mb-4 ${iconClass}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-xl font-bold">
                        {plan.name}
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {plan.formattedPrice}
                        </span>
                        <span className="text-slate-500 ml-2">
                          /{plan.period}
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm mt-2">
                        {plan.description}
                      </p>
                    </CardHeader>

                    <CardContent className="pb-6">
                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-sm text-slate-700 ml-3">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className={`w-full py-5 ${buttonClass} text-white`}
                        disabled={isDisabled}
                      >
                        {isDisabled ? (
                          getButtonText(plan.plan)
                        ) : (
                          <SubscriptionButton
                            plan={plan.plan as BillingPlan}
                            billingCycle="MONTHLY"
                          />
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="yearly" className="mt-8">
            <div className="grid md:grid-cols-3 gap-6">
              {pricingPlans.map((plan, index) => {
                // Apply 20% discount for yearly billing
                const yearlyPrice = calculateYearlyPrice(plan.price);
                const formattedYearlyPrice = `Rp ${yearlyPrice.toLocaleString()}`;

                const IconComponent = plan.icon;
                const isPopular = plan.popular;
                const isCurrentPlan = plan.plan === currentPlan;
                const isDisabled = isPlanDisabled(plan.plan);

                const colorClass = {
                  slate: "border-slate-200 hover:border-slate-300",
                  indigo: "border-indigo-200 hover:border-indigo-300",
                  violet: "border-violet-200 hover:border-violet-300",
                }[plan.color];

                const buttonClass = {
                  slate: isDisabled
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-700 hover:bg-slate-800",
                  indigo: isDisabled
                    ? "bg-indigo-400 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700",
                  violet: isDisabled
                    ? "bg-violet-400 cursor-not-allowed"
                    : "bg-violet-600 hover:bg-violet-700",
                }[plan.color];

                const iconClass = {
                  slate: "bg-slate-100 text-slate-700",
                  indigo: "bg-indigo-100 text-indigo-700",
                  violet: "bg-violet-100 text-violet-700",
                }[plan.color];

                return (
                  <Card
                    key={index}
                    className={`relative h-full transition-all duration-300 ${
                      isCurrentPlan
                        ? "border-2 border-green-500 shadow-lg shadow-green-100"
                        : isPopular
                          ? "border-2 border-indigo-500 shadow-lg shadow-indigo-100"
                          : `border ${colorClass}`
                    }`}
                  >
                    {isCurrentPlan && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-green-600 to-green-800 text-white px-3 py-1 text-xs font-medium">
                        CURRENT PLAN
                      </Badge>
                    )}

                    {!isCurrentPlan && isPopular && (
                      <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white px-3 py-1 text-xs font-medium">
                        MOST POPULAR
                      </Badge>
                    )}

                    <CardHeader className="pb-6">
                      <div className={`p-3 rounded-lg w-fit mb-4 ${iconClass}`}>
                        <IconComponent className="w-6 h-6" />
                      </div>
                      <CardTitle className="text-xl font-bold">
                        {plan.name}
                      </CardTitle>
                      <div className="mt-2">
                        <span className="text-3xl font-bold">
                          {formattedYearlyPrice}
                        </span>
                        <span className="text-slate-500 ml-2">/year</span>
                      </div>
                      <p className="text-slate-600 text-sm mt-2">
                        {plan.description}
                      </p>
                    </CardHeader>

                    <CardContent className="pb-6">
                      <div className="space-y-3">
                        {plan.features.map((feature, featureIndex) => (
                          <div key={featureIndex} className="flex items-start">
                            <div className="flex-shrink-0 mt-1">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span className="text-sm text-slate-700 ml-3">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button
                        className={`w-full py-5 ${buttonClass} text-white`}
                        disabled={isDisabled}
                      >
                        {isDisabled ? (
                          getButtonText(plan.plan)
                        ) : (
                          <SubscriptionButton
                            plan={plan.plan as BillingPlan}
                            billingCycle="YEARLY"
                          />
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Enterprise CTA */}
        <div className="mt-16 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-8 text-white">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold mb-4">
                Need a custom solution?
              </h3>
              <p className="text-slate-300 mb-6">
                Our enterprise plan can be tailored to your specific needs.
                Contact our sales team to discuss a custom solution.
              </p>
              <Button className="bg-white text-slate-900 hover:bg-slate-100">
                Contact Sales
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Custom Integrations</h4>
                <p className="text-sm text-slate-300">
                  Connect with your existing tools and workflows
                </p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Dedicated Support</h4>
                <p className="text-sm text-slate-300">
                  Get priority assistance from our expert team
                </p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Advanced Security</h4>
                <p className="text-sm text-slate-300">
                  Enterprise-grade protection for your data
                </p>
              </div>
              <div className="bg-slate-700/50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Custom Training</h4>
                <p className="text-sm text-slate-300">
                  Onboarding and training for your team
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-slate-900 mb-8 text-center">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-2 text-slate-900">
                Can I change plans anytime?
              </h3>
              <p className="text-slate-600 text-sm">
                Yes! You can upgrade your plan at any time. Changes take effect
                immediately with prorated billing. Note that downgrading is only
                possible after your current subscription expires.
              </p>
            </Card>
            <Card className="p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-2 text-slate-900">
                Is there a free trial?
              </h3>
              <p className="text-slate-600 text-sm">
                We offer a 14-day free trial for all paid plans. No credit card
                required to start exploring premium features.
              </p>
            </Card>
            <Card className="p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-2 text-slate-900">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600 text-sm">
                We accept all major credit cards, bank transfers, and various
                local payment methods through our secure payment processor.
              </p>
            </Card>
            <Card className="p-6 border border-slate-200">
              <h3 className="font-semibold text-lg mb-2 text-slate-900">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600 text-sm">
                Absolutely! You can cancel your subscription at any time with no
                cancellation fees. Your plan will remain active until the end of
                your billing period.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// Loading component for Suspense fallback
const PricingLoading = () => (
  <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
    <div className="container max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <div className="h-8 bg-slate-200 rounded-lg w-96 mx-auto mb-3 animate-pulse" />
        <div className="h-6 bg-slate-200 rounded-lg w-80 mx-auto animate-pulse" />
      </div>
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-96 bg-slate-200 rounded-lg animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// Main component with Suspense boundary
const Pricing = () => {
  return (
    <Suspense fallback={<PricingLoading />}>
      <PricingWithSearchParams />
    </Suspense>
  );
};

export default Pricing;
