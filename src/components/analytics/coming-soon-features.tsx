import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Construction,
  BarChart3,
  Users,
  MessageSquare,
  Link,
  TrendingUp,
  Eye,
  Target,
  Zap,
} from "lucide-react";

const ComingSoonFeatures: React.FC = () => {
  const upcomingFeatures = [
    {
      title: "Instagram Stories Analytics",
      description:
        "Track story views, completion rates, exits, and navigation patterns",
      icon: <Eye className="h-6 w-6 text-purple-500" />,
      category: "Stories",
      estimatedRelease: "Q3 2025",
      features: [
        "Story completion rates",
        "Exit points analysis",
        "Navigation patterns",
        "Story-to-story flow",
      ],
    },
    {
      title: "Competitor Benchmarking",
      description:
        "Compare your performance against competitors in your industry",
      icon: <TrendingUp className="h-6 w-6 text-blue-500" />,
      category: "Competitive Analysis",
      estimatedRelease: "Q3 2025",
      features: [
        "Industry benchmarks",
        "Competitor performance tracking",
        "Market share analysis",
        "Growth rate comparisons",
      ],
    },
    {
      title: "Sentiment Analysis",
      description: "AI-powered analysis of comments and mentions sentiment",
      icon: <MessageSquare className="h-6 w-6 text-green-500" />,
      category: "AI Analytics",
      estimatedRelease: "Q4 2025",
      features: [
        "Comment sentiment scoring",
        "Mention sentiment tracking",
        "Brand perception insights",
        "Crisis detection alerts",
      ],
    },
    {
      title: "Link & CTA Analytics",
      description:
        "Track performance of links, buttons, and call-to-action elements",
      icon: <Link className="h-6 w-6 text-orange-500" />,
      category: "Conversion Tracking",
      estimatedRelease: "Q4 2025",
      features: [
        "Link click tracking",
        "CTA performance metrics",
        "Conversion funnel analysis",
        "Bio link optimization",
      ],
    },
  ];

  return (
    <section id="coming-soon-features" className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Construction className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold">Coming Soon</h2>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          We're constantly improving our analytics platform. Here are the
          exciting features we're working on to give you even deeper insights
          into your social media performance.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {upcomingFeatures.map((feature, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-2 border-dashed border-gray-200 hover:border-blue-300 transition-colors"
          >
            <div className="absolute top-4 right-4">
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-300"
              >
                <Construction className="h-3 w-3 mr-1" />
                {feature.estimatedRelease}
              </Badge>
            </div>

            <CardHeader className="pb-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">{feature.icon}</div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">
                    {feature.title}
                  </CardTitle>
                  <Badge variant="secondary" className="text-xs mb-3">
                    {feature.category}
                  </Badge>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-gray-800">
                  Key Features:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {feature.features.map((item, featureIndex) => (
                    <div
                      key={featureIndex}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      <Zap className="h-3 w-3 text-yellow-500" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700">
                  <strong>Want early access?</strong> These features are in
                  active development. Contact us to join our beta testing
                  program.
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Newsletter Signup */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardContent className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">Stay Updated</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to know when these features are released
          </p>
          <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
            <Badge
              variant="outline"
              className="text-blue-600 border-blue-300 px-4 py-2"
            >
              <Users className="h-4 w-4 mr-2" />
              Updates via Dashboard Notifications
            </Badge>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default ComingSoonFeatures;
