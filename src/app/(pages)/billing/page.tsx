"use client";

import { Check, Star, Zap } from "lucide-react";
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

const pricingPlans = [
  {
    name: "Basic",
    price: "$9",
    period: "month",
    description: "Perfect for individuals getting started",
    features: [
      "Up to 5 projects",
      "Basic templates",
      "Email support",
      "10GB storage",
      "Standard features",
    ],
    popular: false,
    icon: Star,
  },
  {
    name: "Premium",
    price: "$29",
    period: "month",
    description: "Best for growing teams and businesses",
    features: [
      "Unlimited projects",
      "Premium templates",
      "Priority support",
      "100GB storage",
      "Advanced analytics",
      "Team collaboration",
      "Custom integrations",
    ],
    popular: true,
    icon: Zap,
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "For large organizations with advanced needs",
    features: [
      "Everything in Premium",
      "Dedicated support",
      "Unlimited storage",
      "Custom branding",
      "Advanced security",
      "API access",
      "SLA guarantee",
    ],
    popular: false,
    icon: Star,
  },
];

const Pricing = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Flexible pricing options designed to grow with your needs. Start
            free and upgrade anytime.
          </p>
        </div>

        {/* Subscription Status */}
        <div className="mb-16">
          <SubscriptionStatus />
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {pricingPlans.map((plan, index) => {
            const IconComponent = plan.icon;
            return (
              <Card
                key={index}
                className={`relative transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 ${
                  plan.popular
                    ? "border-2 border-blue-500 shadow-xl scale-105"
                    : "border border-slate-200 hover:border-slate-300"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <div
                    className={`mx-auto mb-4 p-3 rounded-full w-fit ${
                      plan.popular ? "bg-blue-100" : "bg-slate-100"
                    }`}
                  >
                    <IconComponent
                      className={`w-8 h-8 ${
                        plan.popular ? "text-blue-600" : "text-slate-600"
                      }`}
                    />
                  </div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-center justify-center mt-4">
                    <span className="text-5xl font-bold text-slate-900">
                      {plan.price}
                    </span>
                    <span className="text-slate-600 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-slate-600 mt-2">{plan.description}</p>
                </CardHeader>

                <CardContent className="px-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-slate-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="px-6 pb-6">
                  <Button
                    className={`w-full py-3 font-semibold transition-all duration-200 ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700 text-white"
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    Get Started
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="text-left p-6">
              <h3 className="font-semibold text-lg mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-slate-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes
                take effect immediately.
              </p>
            </Card>
            <Card className="text-left p-6">
              <h3 className="font-semibold text-lg mb-2">
                Is there a free trial?
              </h3>
              <p className="text-slate-600">
                We offer a 14-day free trial for all paid plans. No credit card
                required to start.
              </p>
            </Card>
            <Card className="text-left p-6">
              <h3 className="font-semibold text-lg mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-slate-600">
                We accept all major credit cards, PayPal, and bank transfers for
                enterprise customers.
              </p>
            </Card>
            <Card className="text-left p-6">
              <h3 className="font-semibold text-lg mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-slate-600">
                Absolutely! You can cancel your subscription at any time with no
                cancellation fees.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
