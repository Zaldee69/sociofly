"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  Star,
  Users,
  Shield,
  Zap,
  Calendar,
  BarChart3,
  MessageSquare,
  Clock,
  Globe,
  Smartphone,
  Target,
  Lightbulb,
  CheckCircle,
  TrendingUp,
  Camera,
  Hash,
  Heart,
  Share2,
  Bell,
  Filter,
  Edit3,
  Palette,
  MonitorPlay,
  Headphones,
  Award,
  Briefcase,
  Rocket,
} from "lucide-react";
import Link from "next/link";

const Index = () => {
  const [activeTab, setActiveTab] = useState("features");

  const features = [
    {
      icon: Calendar,
      title: "Smart Scheduling",
      description:
        "Schedule posts across all platforms with AI-powered timing recommendations for maximum engagement",
      benefits: [
        "Optimal posting times",
        "Bulk scheduling",
        "Content calendar view",
        "Time zone optimization",
      ],
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description:
        "Track performance with detailed insights, engagement metrics, and comprehensive reporting tools",
      benefits: [
        "Real-time metrics",
        "Competitor analysis",
        "ROI tracking",
        "Custom reports",
      ],
    },
    {
      icon: MessageSquare,
      title: "Unified Inbox",
      description:
        "Manage all your social conversations, comments, and messages from one centralized dashboard",
      benefits: [
        "Multi-platform inbox",
        "Auto-responses",
        "Team assignment",
        "Priority filtering",
      ],
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description:
        "Work seamlessly with your team using approval workflows, role management, and task assignments",
      benefits: [
        "Role-based permissions",
        "Approval workflows",
        "Team calendar",
        "Task management",
      ],
    },
    {
      icon: Globe,
      title: "Multi-Platform Support",
      description:
        "Connect and manage Facebook, Instagram, Twitter, LinkedIn, TikTok, YouTube, and more platforms",
      benefits: [
        "10+ platforms",
        "Cross-posting",
        "Platform-specific features",
        "API integrations",
      ],
    },
    {
      icon: Lightbulb,
      title: "AI Content Assistant",
      description:
        "Generate engaging content ideas, captions, and hashtags powered by artificial intelligence",
      benefits: [
        "Content suggestions",
        "Hashtag research",
        "Caption generator",
        "Trend analysis",
      ],
    },
    {
      icon: Target,
      title: "Audience Targeting",
      description:
        "Reach the right audience with advanced targeting options and demographic insights",
      benefits: [
        "Demographic analysis",
        "Audience segmentation",
        "Engagement tracking",
        "Growth insights",
      ],
    },
    {
      icon: Shield,
      title: "Brand Safety",
      description:
        "Protect your brand with content moderation, approval workflows, and compliance tools",
      benefits: [
        "Content moderation",
        "Brand guidelines",
        "Compliance tracking",
        "Risk management",
      ],
    },
    {
      icon: Camera,
      title: "Visual Content Editor",
      description:
        "Create stunning visuals with our built-in editor, templates, and design tools",
      benefits: [
        "Photo editor",
        "Video editing",
        "Template library",
        "Brand assets",
      ],
    },
  ];

  const platforms = [
    {
      name: "Facebook",
      users: "2.9B",
      color: "bg-blue-600",
      features: ["Pages & Groups", "Stories", "Reels", "Events"],
    },
    {
      name: "Instagram",
      users: "2.0B",
      color: "bg-pink-600",
      features: ["Feed Posts", "Stories", "Reels", "IGTV"],
    },
    {
      name: "Twitter",
      users: "450M",
      color: "bg-sky-500",
      features: ["Tweets", "Threads", "Spaces", "Lists"],
    },
    {
      name: "LinkedIn",
      users: "900M",
      color: "bg-blue-700",
      features: ["Posts", "Articles", "Stories", "Events"],
    },
    {
      name: "TikTok",
      users: "1.0B",
      color: "bg-black",
      features: ["Videos", "Stories", "Live", "Duets"],
    },
    {
      name: "YouTube",
      users: "2.7B",
      color: "bg-red-600",
      features: ["Videos", "Shorts", "Live", "Community"],
    },
  ];

  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechCorp",
      content:
        "SocialSync has revolutionized our social media strategy. We've seen a 300% increase in engagement and saved 15 hours per week.",
      rating: 5,
      avatar: "SJ",
    },
    {
      name: "Mike Chen",
      role: "Social Media Manager",
      company: "Fashion Brand",
      content:
        "The unified inbox feature is a game-changer. Managing conversations across all platforms has never been easier.",
      rating: 5,
      avatar: "MC",
    },
    {
      name: "Lisa Rodriguez",
      role: "Digital Marketing Specialist",
      company: "StartupXYZ",
      content:
        "The analytics dashboard provides insights we never had before. Our ROI has improved by 200% since using SocialSync.",
      rating: 5,
      avatar: "LR",
    },
  ];

  const integrations = [
    {
      name: "Google Analytics",
      icon: BarChart3,
      description: "Track website traffic from social media",
    },
    {
      name: "Canva",
      icon: Palette,
      description: "Create stunning visuals directly in platform",
    },
    {
      name: "Zapier",
      icon: Zap,
      description: "Connect with 3000+ apps and automate workflows",
    },
    {
      name: "Slack",
      icon: MessageSquare,
      description: "Get notifications and collaborate with team",
    },
    {
      name: "Shopify",
      icon: Briefcase,
      description: "Sync products and drive e-commerce sales",
    },
    {
      name: "Mailchimp",
      icon: Heart,
      description: "Integrate email marketing campaigns",
    },
  ];

  const useCases = [
    {
      title: "Small Business",
      description:
        "Perfect for local businesses looking to build their online presence",
      icon: Briefcase,
      features: [
        "Basic scheduling",
        "Essential analytics",
        "2-3 platforms",
        "Email support",
      ],
    },
    {
      title: "Marketing Agency",
      description:
        "Manage multiple clients with advanced features and white-label options",
      icon: Users,
      features: [
        "Client management",
        "White-label reports",
        "Team collaboration",
        "Priority support",
      ],
    },
    {
      title: "Enterprise",
      description:
        "Scale social media operations with enterprise-grade security and features",
      icon: Rocket,
      features: [
        "Advanced security",
        "Custom integrations",
        "Dedicated support",
        "SLA guarantee",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">SocialSync</span>
          </div>
          <div className="hidden md:flex space-x-8">
            <Link
              href="/"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/pricing"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#features"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Features
            </Link>
            <Link
              href="#platforms"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Platforms
            </Link>
            <Link
              href="#testimonials"
              className="text-slate-600 hover:text-slate-900 transition-colors"
            >
              Reviews
            </Link>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline">Sign In</Button>
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              Start Free Trial
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
          🚀 New: AI-Powered Content Suggestions
        </Badge>
        <h1 className="text-6xl font-bold text-slate-900 mb-6 leading-tight">
          The Complete
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {" "}
            Social Media
          </span>
          <br />
          Management Solution
        </h1>
        <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
          Schedule posts, engage with your audience, analyze performance, and
          grow your brand across all social media platforms. Join 10,000+
          businesses already using SocialSync to dominate their social media
          presence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/pricing">
            <Button
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 px-8"
            >
              Start Free Trial
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="px-8">
            <MonitorPlay className="mr-2 w-4 h-4" />
            Watch Demo
          </Button>
        </div>

        {/* Platform Icons */}
        <div className="flex justify-center items-center space-x-6 opacity-60">
          <span className="text-sm text-slate-500">
            Trusted by teams using:
          </span>
          {platforms.slice(0, 4).map((platform, index) => (
            <div
              key={index}
              className={`w-8 h-8 ${platform.color} rounded-lg flex items-center justify-center`}
            >
              <span className="text-white text-xs font-bold">
                {platform.name[0]}
              </span>
            </div>
          ))}
          <span className="text-slate-400">+6 more</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Everything You Need for Social Media Success
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Powerful features designed to streamline your social media workflow
            and maximize your online impact.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <Card
                key={index}
                className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-fit">
                    <IconComponent className="w-8 h-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-slate-600 mb-4">{feature.description}</p>
                  <div className="space-y-2">
                    {feature.benefits.map((benefit, idx) => (
                      <div
                        key={idx}
                        className="flex items-center text-sm text-slate-500"
                      >
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Platforms Section */}
      <section id="platforms" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Connect All Your Social Platforms
            </h2>
            <p className="text-xl text-slate-600 mb-12">
              Manage your entire social media presence from one unified
              dashboard
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {platforms.map((platform, index) => (
              <Card
                key={index}
                className="p-6 text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div
                  className={`w-16 h-16 ${platform.color} rounded-2xl mx-auto mb-4 flex items-center justify-center`}
                >
                  <span className="text-white text-2xl font-bold">
                    {platform.name[0]}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-1">
                  {platform.name}
                </h3>
                <p className="text-slate-500 mb-3">{platform.users} users</p>
                <div className="space-y-1">
                  {platform.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-slate-600 flex items-center justify-center"
                    >
                      <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
                      {feature}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Perfect for Every Business Size
          </h2>
          <p className="text-xl text-slate-600">
            From startups to enterprises, SocialSync scales with your needs
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {useCases.map((useCase, index) => {
            const IconComponent = useCase.icon;
            return (
              <Card
                key={index}
                className="p-8 text-center hover:shadow-lg transition-shadow duration-300"
              >
                <div className="mx-auto mb-6 p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-fit">
                  <IconComponent className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">
                  {useCase.title}
                </h3>
                <p className="text-slate-600 mb-6">{useCase.description}</p>
                <div className="space-y-2">
                  {useCase.features.map((feature, idx) => (
                    <div
                      key={idx}
                      className="flex items-center text-sm text-slate-600"
                    >
                      <Star className="w-4 h-4 text-yellow-500 mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-slate-600">
              Join thousands of satisfied customers who trust SocialSync
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-4">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                    <p className="text-sm text-slate-500">
                      {testimonial.company}
                    </p>
                  </div>
                </div>
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-yellow-500 fill-current"
                    />
                  ))}
                </div>
                <p className="text-slate-700 italic">"{testimonial.content}"</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Powerful Integrations
          </h2>
          <p className="text-xl text-slate-600">
            Connect with your favorite tools and streamline your workflow
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration, index) => {
            const IconComponent = integration.icon;
            return (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg mr-4">
                    <IconComponent className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {integration.name}
                  </h3>
                </div>
                <p className="text-slate-600">{integration.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10K+</div>
              <p className="text-slate-600">Active Users</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">5M+</div>
              <p className="text-slate-600">Posts Scheduled</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">50+</div>
              <p className="text-slate-600">Countries</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-orange-600 mb-2">
                99.9%
              </div>
              <p className="text-slate-600">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-slate-600 mb-12">
            Choose the perfect plan for your social media needs. Start free,
            upgrade anytime.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-12">
          <Card className="border border-slate-200">
            <CardHeader className="text-center">
              <CardTitle>Starter</CardTitle>
              <div className="text-3xl font-bold">
                $9<span className="text-sm font-normal">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />3
                  social accounts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  30 posts per month
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Basic analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Email support
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-blue-500 shadow-lg scale-105">
            <CardHeader className="text-center">
              <Badge className="mb-2 bg-blue-500">Most Popular</Badge>
              <CardTitle>Professional</CardTitle>
              <div className="text-3xl font-bold">
                $29<span className="text-sm font-normal">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  10 social accounts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Unlimited posts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Advanced analytics
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Team collaboration
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Priority support
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border border-slate-200">
            <CardHeader className="text-center">
              <CardTitle>Enterprise</CardTitle>
              <div className="text-3xl font-bold">
                $99<span className="text-sm font-normal">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Unlimited accounts
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  White-label solution
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Custom integrations
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  Dedicated support
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  SLA guarantee
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Link href="/pricing">
            <Button size="lg" className="bg-slate-900 hover:bg-slate-800">
              View All Plans & Features
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-4xl mx-auto bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <CardContent className="p-12">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Social Media?
            </h2>
            <p className="text-xl mb-8 text-blue-100">
              Join thousands of businesses already using SocialSync to grow
              their online presence. Start your free trial today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/pricing">
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-blue-50 px-8"
                >
                  Start Your Free Trial
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white hover:text-blue-600 px-8"
              >
                <Headphones className="mr-2 w-4 h-4" />
                Schedule Demo
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">SocialSync</span>
              </div>
              <p className="text-slate-400">
                The complete social media management solution for modern
                businesses.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-4">Product</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    API
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Company</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Careers
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4">Support</h3>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Status
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center">
            <p className="text-slate-400">
              © 2025 SocialSync. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
