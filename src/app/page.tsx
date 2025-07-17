"use client";

import { useState, useEffect } from "react";
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
  Grid3X3,
  List,
  Eye,
  MousePointer,
  MessageCircle,
  ThumbsUp,
  Send,
  Play,
  ChevronRight,
  Building,
  Sparkles,
  ShieldCheck,
  Layers,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  ArrowUpRight,
  Infinity,
  Workflow,
  Paintbrush,
  Megaphone,
  BarChart,
  Users2,
  Zap as ZapIcon,
} from "lucide-react";
import Link from "next/link";

// Client-only component for floating elements
const FloatingElement = ({
  children,
  className = "",
  ...props
}: {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};

const Index = () => {
  const [activeView, setActiveView] = useState("feed");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Safe hydration approach - use CSS class instead of conditional rendering
  useEffect(() => {
    document.documentElement.classList.add("hydrated");
  }, []);

  const viewModes = [
    {
      id: "feed",
      name: "Feed",
      icon: Eye,
      title: "A feed view to see your posts",
      description:
        "Looks & feels like the native platforms, so it's instantly familiar.",
      features: [
        "Post previews in plain sight, zero clicks needed",
        "Feedback and approvals in context, right next to the content",
        "Native platform feel for instant familiarity",
      ],
      gradient: "from-blue-400 to-blue-500",
    },
    {
      id: "calendar",
      name: "Calendar",
      icon: Calendar,
      title: "A calendar with actual post previews",
      description:
        "See how your content comes together in a rich calendar view.",
      features: [
        "Schedule, approve, and delete with handy shortcuts",
        "Plan your weeks and months in seconds with drag & drop",
        "Visual content planning at a glance",
      ],
      gradient: "from-purple-400 to-purple-500",
    },
    {
      id: "grid",
      name: "Grid",
      icon: Grid3X3,
      title: "Instagram grid view & planner",
      description:
        "Drag & drop your posts until your Instagram grid looks perfect.",
      features: [
        "See your complete grid, even with content published outside",
        "Perfect grid planning for Instagram",
        "Visual harmony optimization",
      ],
      gradient: "from-pink-400 to-pink-500",
    },
    {
      id: "list",
      name: "List",
      icon: List,
      title: "List view for quick actions",
      description:
        "Bulk approve, schedule, delete, and duplicate across workspaces.",
      features: [
        "Filter posts, select all, and apply changes in one go",
        "Save custom views for easy future access",
        "Bulk operations made simple",
      ],
      gradient: "from-orange-400 to-orange-500",
    },
  ];

  const collaborationFeatures = [
    {
      icon: MessageCircle,
      title: "Comments, suggestions, annotations",
      description: "Keep all feedback, private or not, in one place.",
      details: [
        "Get precise feedback with suggestions and annotations",
        "Share one-time links for quick, ad-hoc feedback",
        "Centralized conversation history",
      ],
      gradient: "from-blue-400 to-blue-500",
      iconBg: "bg-blue-500",
    },
    {
      icon: ThumbsUp,
      title: "Approvals you can customize",
      description:
        "Approve posts step-by-step, like an assembly line (but less boring).",
      details: [
        "Clear and explicit green light — schedule posts with confidence",
        "Satisfying one-click approvals that clients love",
        "One approval inbox so no post is skipped",
      ],
      gradient: "from-green-400 to-green-500",
      iconBg: "bg-green-500",
    },
  ];

  const industries = [
    {
      title: "For agencies",
      description: "impress your clients and take on more",
      icon: Briefcase,
      gradient: "from-blue-400 to-blue-500",
      features: [
        "Client management",
        "White-label reports",
        "Team collaboration",
        "Priority support",
      ],
      stats: "500+ agencies",
      bgPattern: "bg-gradient-to-br from-blue-50 to-blue-100",
    },
    {
      title: "For multi-location brands",
      description: "all your locations, one content flow",
      icon: Building,
      gradient: "from-purple-400 to-purple-500",
      features: [
        "Location management",
        "Centralized content",
        "Brand consistency",
        "Scalable workflows",
      ],
      stats: "1000+ locations",
      bgPattern: "bg-gradient-to-br from-purple-50 to-purple-100",
    },
    {
      title: "For multi-brand companies",
      description: "content collaboration at scale",
      icon: Layers,
      gradient: "from-green-400 to-green-500",
      features: [
        "Multi-brand management",
        "Cross-brand collaboration",
        "Unified reporting",
        "Brand guidelines",
      ],
      stats: "200+ brands",
      bgPattern: "bg-gradient-to-br from-green-50 to-green-100",
    },
  ];

  const testimonials = [
    {
      name: "Aisha M.",
      role: "Co-founder",
      company: "Creative Label",
      content:
        "SocioFly is the best client-facing social media tool we've ever used and we've used a lot.",
      rating: 5,
      avatar: "AM",
      highlight: true,
      gradient: "from-blue-400 to-blue-500",
    },
    {
      name: "Sarah Johnson",
      role: "Marketing Director",
      company: "TechCorp",
      content:
        "The team loved it from the start. SocioFly helps us overview the entire marketing efforts.",
      rating: 5,
      avatar: "SJ",
      highlight: false,
      gradient: "from-purple-400 to-purple-500",
    },
    {
      name: "Mike Chen",
      role: "Social Media Manager",
      company: "Fashion Brand",
      content:
        "We've saved 85% time on meetings and emails. From creation to approving posts in under 9 hours.",
      rating: 5,
      avatar: "MC",
      highlight: false,
      gradient: "from-green-400 to-green-500",
    },
  ];

  const platforms = [
    { name: "Facebook", color: "bg-blue-600", letter: "f", users: "2.9B" },
    {
      name: "Instagram",
      color: "bg-gradient-to-br from-purple-600 to-pink-600",
      letter: "i",
      users: "2.0B",
    },
    { name: "Twitter", color: "bg-gray-900", letter: "𝕏", users: "450M" },
    { name: "LinkedIn", color: "bg-blue-700", letter: "in", users: "900M" },
    { name: "TikTok", color: "bg-black", letter: "tt", users: "1.0B" },
    { name: "YouTube", color: "bg-red-600", letter: "yt", users: "2.7B" },
  ];

  const features = [
    {
      title: "AI-powered",
      description:
        "Need inspiration? Generate, rewrite, and get copy from images or videos directly in the post composer.",
      icon: Sparkles,
      gradient: "from-purple-400 to-purple-500",
      category: "Creation",
    },
    {
      title: "Analytics & Reporting",
      description:
        "Show your results in style with fast reports, instantly spot winning content, and gain audience insights.",
      icon: BarChart3,
      gradient: "from-blue-400 to-blue-500",
      category: "Analytics",
    },
    {
      title: "Mobile App: SMM on the go",
      description:
        "Create, edit, review, and approve content. Stay on top of your social tasks anywhere with notifications.",
      icon: Smartphone,
      gradient: "from-green-400 to-green-500",
      category: "Mobile",
    },
    {
      title: "Image & Video editor",
      description:
        "Trim, resize, crop — adjust your assets for each channel in one place.",
      icon: Camera,
      gradient: "from-orange-400 to-orange-500",
      category: "Creation",
    },
    {
      title: "Work on any type of content",
      description:
        "Blogs? Newsletters? Emails? Social media posts? Seriously, bring it all in SocioFly.",
      icon: Edit3,
      gradient: "from-indigo-400 to-indigo-500",
      category: "Content",
    },
    {
      title: "Brand Safety",
      description:
        "Protect your brand with content moderation, approval workflows, and compliance tools.",
      icon: ShieldCheck,
      gradient: "from-emerald-400 to-emerald-500",
      category: "Security",
    },
  ];

  const stats = [
    {
      number: "30K+",
      label: "Active marketers",
      gradient: "from-blue-400 to-blue-500",
    },
    {
      number: "5M+",
      label: "Posts scheduled",
      gradient: "from-purple-400 to-purple-500",
    },
    {
      number: "50+",
      label: "Countries",
      gradient: "from-green-400 to-green-500",
    },
    {
      number: "99.9%",
      label: "Uptime",
      gradient: "from-orange-400 to-orange-500",
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 md:hidden">
          <div className="fixed right-0 top-0 h-full w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Menu
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMobileMenuOpen(false)}
                  className="hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <nav className="space-y-6">
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">
                    Solutions
                  </h3>
                  <div className="space-y-3">
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Briefcase className="w-4 h-4 mr-3" />
                      For agencies
                    </Link>
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Building className="w-4 h-4 mr-3" />
                      For multi-location brands
                    </Link>
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Layers className="w-4 h-4 mr-3" />
                      For multi-brand companies
                    </Link>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wider mb-4">
                    Product
                  </h3>
                  <div className="space-y-3">
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 mr-3" />
                      Features
                    </Link>
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 mr-3" />
                      Analytics
                    </Link>
                    <Link
                      href="#"
                      className="flex items-center text-gray-700 hover:text-blue-600 transition-colors"
                    >
                      <Zap className="w-4 h-4 mr-3" />
                      Integrations
                    </Link>
                  </div>
                </div>
                <div className="pt-6 border-t">
                  <div className="space-y-3">
                    <Button variant="outline" className="w-full justify-center">
                      Log in
                    </Button>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Try for free
                    </Button>
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="border-b bg-white sticky top-0 z-40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">
                  SocioFly
                </span>
              </div>

              <div className="hidden md:flex items-center space-x-1">
                <div className="relative group">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    Solutions
                    <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </Button>
                </div>
                <div className="relative group">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    Product
                    <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </Button>
                </div>
                <Link
                  href="#"
                  className="text-gray-600 hover:text-gray-900 font-medium px-3 py-2 rounded-lg hover:bg-gray-50 transition-all"
                >
                  Pricing
                </Link>
                <div className="relative group">
                  <Button
                    variant="ghost"
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                  >
                    Resources
                    <ChevronDown className="w-4 h-4 ml-1 transition-transform group-hover:rotate-180" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="hidden md:flex items-center space-x-3">
                <Button
                  variant="ghost"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
                >
                  Log in
                </Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all">
                  Try for free
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="md:hidden hover:bg-gray-100"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(59,130,246,0.1)_100%)]"></div>
        </div>

        {/* Floating Elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Floating Cards */}
          <FloatingElement className="absolute top-20 left-10 bg-white rounded-2xl p-4 shadow-lg optimized-animation">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">
                Post approved!
              </span>
            </div>
          </FloatingElement>

          <FloatingElement className="absolute top-32 right-16 bg-white rounded-2xl p-4 shadow-lg optimized-animation">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Scheduled for 2PM
              </span>
            </div>
          </FloatingElement>

          <FloatingElement className="absolute bottom-40 left-20 bg-white rounded-2xl p-4 shadow-lg optimized-animation">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-700">
                +24% engagement
              </span>
            </div>
          </FloatingElement>

          <FloatingElement className="absolute bottom-32 right-12 bg-white rounded-2xl p-4 shadow-lg optimized-animation">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">
                3 new comments
              </span>
            </div>
          </FloatingElement>

          {/* Floating Geometric Shapes */}
          <FloatingElement className="absolute top-40 right-1/4 w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-20 animate-pulse-light"></FloatingElement>
          <FloatingElement className="absolute bottom-60 left-1/4 w-16 h-16 bg-gradient-to-r from-pink-400 to-orange-400 rounded-xl opacity-20 animate-fade-light"></FloatingElement>
          <FloatingElement className="absolute top-1/3 left-1/3 w-12 h-12 bg-gradient-to-r from-green-400 to-teal-400 rounded-full opacity-20 animate-pulse-light"></FloatingElement>
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center max-w-5xl mx-auto">
            <div className="relative inline-block mb-8">
              <Badge className="bg-white/80 backdrop-blur-sm text-blue-700 border-blue-200 text-sm px-6 py-3 rounded-full shadow-lg hover:shadow-xl smooth-transition optimized-animation">
                <Sparkles className="w-4 h-4 mr-2" />
                New: AI-powered content creation
              </Badge>
            </div>

            <h1 className="text-5xl md:text-7xl font-semibold mb-8 leading-tight">
              <span className="text-gray-900">Plan social like a</span>
              <br />
              <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                team
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Social media scheduling, collaboration, and organization in one
              place.
              <br className="hidden md:block" />
              Join 30,000+ marketers who love working with SocioFly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <Button
                size="lg"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium shadow-lg hover:shadow-xl smooth-transition optimized-animation"
              >
                Go ahead, start free
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4 text-lg font-medium border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 smooth-transition shadow-md hover:shadow-lg optimized-animation"
              >
                <Play className="mr-2 w-5 h-5" />
                Book a demo
              </Button>
            </div>

            {/* Enhanced Social Proof */}
            <div className="relative">
              {/* Main Card */}
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-100 mb-16 hover:shadow-xl smooth-transition optimized-animation">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex items-center text-center lg:text-left">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-6 shadow-xl">
                      AM
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-gray-900 mb-2">
                        "It's the best client-facing social media tool we've
                        ever used and we've used a lot."
                      </p>
                      <p className="text-gray-600">
                        <strong>Aisha M.</strong>, Co-founder @Creative Label
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-8">
                    <div className="text-center bg-blue-50 rounded-2xl p-4 shadow-lg">
                      <div className="text-4xl font-semibold text-blue-600 mb-2">
                        85%
                      </div>
                      <p className="text-sm text-gray-600">
                        Time saved on
                        <br />
                        meetings & emails
                      </p>
                    </div>

                    <div className="text-center bg-purple-50 rounded-2xl p-4 shadow-lg">
                      <div className="text-4xl font-semibold text-purple-600 mb-2">
                        &lt;9h
                      </div>
                      <p className="text-sm text-gray-600">
                        From creation to
                        <br />
                        approving posts
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Rating Stars */}
              <FloatingElement className="absolute -top-4 -right-4 bg-yellow-400 rounded-full p-3 shadow-xl animate-bounce-light">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-white fill-current" />
                  ))}
                </div>
              </FloatingElement>

              {/* Floating Badge */}
              <FloatingElement className="absolute -bottom-2 -left-4 bg-green-500 text-white rounded-full px-4 py-2 shadow-xl text-sm font-medium">
                ✓ Verified Review
              </FloatingElement>
            </div>

            {/* Enhanced Platform Icons */}
            <div className="relative">
              {/* Main Platform Container */}
              <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-xl smooth-transition">
                <div className="flex flex-wrap justify-center items-center gap-6">
                  <span className="text-sm text-gray-600 font-medium">
                    Schedule & publish on 9 platforms
                  </span>
                  <div className="flex flex-wrap justify-center gap-3">
                    {platforms.slice(0, 4).map((platform, index) => (
                      <div key={index} className="group relative">
                        <div
                          className={`w-12 h-12 ${platform.color} rounded-xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all transform hover:scale-110 hover:-translate-y-1`}
                        >
                          <span className="text-white text-sm font-semibold">
                            {platform.letter}
                          </span>
                        </div>
                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                          {platform.users}
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-110">
                      <span className="text-gray-600 text-sm font-medium">
                        +5
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Connection Lines */}
              <div
                className={`absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full shadow-lg animate-pulse-light`}
              ></div>
              <div
                className={`absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full shadow-lg animate-pulse-light delay-1000`}
              ></div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Multi-View Showcase */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            {/* Enhanced View Mode Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {viewModes.map((mode) => (
                <Button
                  key={mode.id}
                  variant={activeView === mode.id ? "default" : "outline"}
                  onClick={() => setActiveView(mode.id)}
                  className={`${
                    activeView === mode.id
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  } px-8 py-3 font-medium transition-all smooth-transition optimized-animation`}
                >
                  <mode.icon className="w-4 h-4 mr-2" />
                  {mode.name}
                </Button>
              ))}
            </div>

            {/* Enhanced Active View Content */}
            {viewModes.map(
              (mode) =>
                activeView === mode.id && (
                  <div
                    key={mode.id}
                    className="grid lg:grid-cols-2 gap-16 items-center"
                  >
                    <div className="space-y-8">
                      <div>
                        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-6 leading-tight">
                          {mode.title}
                        </h2>
                        <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                          {mode.description}
                        </p>
                      </div>

                      <div className="space-y-4">
                        {mode.features.map((feature, idx) => (
                          <div key={idx} className="flex items-start group">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center mr-4 mt-1 shadow-md">
                              <CheckCircle className="w-4 h-4 text-white" />
                            </div>
                            <span className="text-gray-700 text-lg group-hover:text-gray-900 transition-colors">
                              {feature}
                            </span>
                          </div>
                        ))}
                      </div>

                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-medium shadow-md hover:shadow-lg transition-all smooth-transition optimized-animation">
                        Try this view
                        <ArrowUpRight className="ml-2 w-4 h-4" />
                      </Button>
                    </div>

                    <div className="relative">
                      {/* Main Interface Card */}
                      <div className="bg-white rounded-3xl p-8 min-h-[500px] shadow-xl border border-gray-100 hover:shadow-2xl smooth-transition smooth-transition optimized-animation">
                        <div className="text-center">
                          {/* Window Controls */}
                          <div className="flex justify-start space-x-2 mb-6">
                            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          </div>

                          {/* Interface Preview */}
                          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 mb-6">
                            <div
                              className={`w-20 h-20 bg-gradient-to-r ${mode.gradient} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}
                            >
                              <mode.icon className="w-10 h-10 text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                              {mode.name} Interface
                            </h3>
                            <p className="text-gray-600 text-sm">
                              Interactive mockup preview
                            </p>
                          </div>

                          {/* Floating Mock Elements */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                              <div className="w-8 h-8 bg-gray-300 rounded-full mb-2"></div>
                              <div className="h-2 bg-gray-300 rounded mb-1"></div>
                              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                            </div>
                            <div className="bg-gray-50 rounded-lg p-3 shadow-sm">
                              <div className="w-8 h-8 bg-gray-300 rounded-full mb-2"></div>
                              <div className="h-2 bg-gray-300 rounded mb-1"></div>
                              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Floating Action Buttons */}
                      <div
                        className={`absolute -top-4 -right-4 bg-blue-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 animate-pulse-light`}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div
                        className={`absolute -bottom-4 -left-4 bg-green-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 animate-pulse-light delay-1000`}
                      >
                        <Zap className="w-5 h-5" />
                      </div>
                      <div
                        className={`absolute top-1/2 -left-6 bg-purple-500 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 animate-bounce-light`}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div
                        className={`absolute top-1/3 -right-6 bg-orange-500 text-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-110 animate-bounce-light delay-500`}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </div>

                      {/* Floating Stats */}
                      <div className="absolute top-8 right-8 bg-white rounded-xl p-3 shadow-lg border border-gray-100 hover:shadow-xl transition-all">
                        <div className="text-xs text-gray-500">Live Stats</div>
                        <div className="text-sm font-bold text-green-600">
                          +24%
                        </div>
                      </div>
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      </section>

      {/* Enhanced Collaboration Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12">
              {collaborationFeatures.map((feature, index) => (
                <div key={index} className="relative flex flex-col h-full">
                  {/* Main Feature Card */}
                  <div className="bg-white rounded-3xl p-8 shadow-xl border border-gray-100 hover:shadow-2xl smooth-transition smooth-transition optimized-animation flex-1">
                    <div className="text-center mb-8">
                      <div
                        className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                      >
                        <feature.icon className="w-8 h-8 text-white" />
                      </div>

                      <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                        {feature.title}
                      </h3>
                      <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>

                    <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 space-y-4 mb-8">
                      {feature.details.map((detail, idx) => (
                        <div key={idx} className="flex items-start text-left">
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 shadow-lg">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-gray-700 text-sm leading-relaxed">
                            {detail}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="text-center">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 font-normal shadow-lg hover:shadow-xl transition-all smooth-transition optimized-animation">
                        Try for free
                      </Button>
                    </div>
                  </div>

                  {/* Floating Elements */}
                  <div
                    className={`absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-xl animate-pulse-light`}
                  >
                    <CheckCircle className="w-4 h-4" />
                  </div>

                  <div
                    className={`absolute -bottom-3 -left-3 bg-purple-500 text-white rounded-full p-2 shadow-xl animate-pulse-light delay-1000`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>

                  {/* Floating Mock Comment */}
                  {index === 0 && (
                    <div className="absolute top-20 -left-8 bg-white rounded-2xl p-4 shadow-xl border border-gray-100 transform rotate-3 hover:rotate-6 transition-transform">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            JD
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          "Looks great! 👍"
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Floating Approval Badge */}
                  {index === 1 && (
                    <div className="absolute top-20 -right-8 bg-white rounded-2xl p-4 shadow-xl border border-gray-100 transform -rotate-3 hover:-rotate-6 transition-transform">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                        <div className="text-xs text-gray-600">
                          Approved by Sarah
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Industries Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              For modern{" "}
              <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                content teams
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to create, plan, schedule and share brilliant
              content across all your channels.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {industries.map((industry, index) => (
              <div key={index} className="relative group">
                <Card className="bg-white border-0 shadow-lg hover:shadow-xl smooth-transition h-full optimized-animation">
                  <CardContent className="p-8 flex flex-col h-full text-center">
                    {/* Icon Section */}
                    <div className="mb-8">
                      <div
                        className={`w-20 h-20 bg-gradient-to-r ${industry.gradient} rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-lg relative`}
                      >
                        <industry.icon className="w-10 h-10 text-white" />
                        {/* Status indicator */}
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg animate-pulse-light"></div>
                      </div>
                    </div>

                    {/* Title & Description */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 mb-3">
                        {industry.title}
                      </h3>
                      <p className="text-gray-600 text-lg mb-4">
                        {industry.description}
                      </p>
                      <div className="inline-flex items-center bg-gray-100 rounded-full px-4 py-2 text-sm font-medium text-gray-700">
                        {industry.stats}
                      </div>
                    </div>

                    {/* Features List */}
                    <div className="flex-1 space-y-4 mb-8">
                      {industry.features.map((feature, idx) => (
                        <div
                          key={idx}
                          className="flex items-center text-left text-gray-700"
                        >
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center mr-4 flex-shrink-0">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-sm font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <Button
                      variant="outline"
                      className="w-full border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 smooth-transition font-medium"
                    >
                      Learn More
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Floating decoration elements */}
                <div
                  className={`absolute -top-3 -right-3 w-12 h-12 bg-gradient-to-r ${industry.gradient} rounded-full flex items-center justify-center shadow-lg animate-bounce-light`}
                >
                  <industry.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              All the features to make <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                your life easier
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              AI-empowered creation, customizable workflows, easy approvals,
              insightful analytics, and more.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="relative group">
                <Card className="border-0 shadow-lg hover:shadow-xl smooth-transition smooth-transition optimized-animation group-hover:scale-[1.02] bg-white">
                  <CardContent className="p-8">
                    <div className="flex items-start space-x-6">
                      <div
                        className={`p-4 bg-gradient-to-r ${feature.gradient} rounded-2xl shadow-xl group-hover:shadow-xl transition-all transform group-hover:scale-[1.03] relative`}
                      >
                        <feature.icon className="w-8 h-8 text-white" />
                        {/* Floating dot */}
                        <div
                          className={`absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-fade-light`}
                        ></div>
                      </div>
                      <div className="flex-1">
                        <Badge className="mb-3 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 border-gray-200 text-xs shadow-sm">
                          {feature.category}
                        </Badge>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Floating elements specific to each feature */}
                {index === 0 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-purple-500 text-white rounded-full p-2 shadow-xl animate-bounce-light`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                {index === 1 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-blue-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-500`}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </div>
                )}
                {index === 2 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-green-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-1000`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </div>
                )}
                {index === 3 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-orange-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-1500`}
                  >
                    <Camera className="w-4 h-4" />
                  </div>
                )}
                {index === 4 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-indigo-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-2000`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </div>
                )}
                {index === 5 && (
                  <div
                    className={`absolute -top-3 -right-3 bg-emerald-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-2500`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                )}

                {/* Floating connection line */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-gray-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-medium shadow-md hover:shadow-lg transition-all smooth-transition optimized-animation">
              Try all features free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced Stats Section */}
      <section className="py-20 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-600">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-semibold text-white mb-6">
              Trusted by teams worldwide
            </h2>
            <p className="text-xl text-slate-200 max-w-2xl mx-auto">
              Join thousands of marketers who've transformed their social media
              workflow with SocioFly.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 hover:bg-white/20 transition-all">
                  <div className="text-5xl font-semibold text-white mb-4">
                    {stat.number}
                  </div>
                  <p className="text-slate-200 font-medium">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Customer Testimonials */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              So easy it barely needs support,
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                but when it does, it's great
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              30,000+ marketers approve this message
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="relative group">
                <Card
                  className={`${testimonial.highlight ? "ring-2 ring-blue-500 shadow-xl" : "shadow-xl"} border-0 hover:shadow-xl smooth-transition smooth-transition optimized-animation bg-white`}
                >
                  <CardContent className="p-8">
                    <div className="flex items-center mb-6">
                      <div
                        className={`w-16 h-16 bg-gradient-to-r ${testimonial.gradient} rounded-full flex items-center justify-center text-white font-semibold mr-6 shadow-xl relative`}
                      >
                        {testimonial.avatar}
                        {/* Online indicator */}
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white shadow-lg"></div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">
                          {testimonial.name}
                        </h4>
                        <p className="text-gray-600">{testimonial.role}</p>
                        <p className="text-gray-500 text-sm">
                          @{testimonial.company}
                        </p>
                      </div>
                    </div>
                    <div className="flex mb-4 justify-center">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-5 h-5 text-yellow-400 fill-current drop-shadow-sm"
                        />
                      ))}
                    </div>
                    <p className="text-gray-700 text-lg leading-relaxed italic">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>

                {/* Floating elements for each testimonial */}
                {index === 0 && (
                  <>
                    <div
                      className={`absolute -top-4 -right-4 bg-blue-500 text-white rounded-full p-2 shadow-xl animate-bounce-light`}
                    >
                      <Heart className="w-4 h-4" />
                    </div>
                    <div
                      className={`absolute -bottom-3 -left-3 bg-white rounded-full p-2 shadow-xl border border-gray-200 animate-pulse-light`}
                    >
                      <ThumbsUp className="w-4 h-4 text-blue-500" />
                    </div>
                  </>
                )}
                {index === 1 && (
                  <>
                    <div
                      className={`absolute -top-4 -right-4 bg-purple-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-500`}
                    >
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div
                      className={`absolute -bottom-3 -left-3 bg-white rounded-full p-2 shadow-xl border border-gray-200 animate-pulse-light delay-1000`}
                    >
                      <Eye className="w-4 h-4 text-purple-500" />
                    </div>
                  </>
                )}
                {index === 2 && (
                  <>
                    <div
                      className={`absolute -top-4 -right-4 bg-green-500 text-white rounded-full p-2 shadow-xl animate-bounce-light delay-1000`}
                    >
                      <Clock className="w-4 h-4" />
                    </div>
                    <div
                      className={`absolute -bottom-3 -left-3 bg-white rounded-full p-2 shadow-xl border border-gray-200 animate-pulse-light delay-1500`}
                    >
                      <Zap className="w-4 h-4 text-green-500" />
                    </div>
                  </>
                )}

                {/* Floating quote marks */}
                <div className="absolute top-2 left-2 text-6xl text-gray-100 font-serif leading-none pointer-events-none">
                  "
                </div>
                <div className="absolute bottom-2 right-2 text-6xl text-gray-100 font-serif leading-none pointer-events-none rotate-180">
                  "
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section className="relative py-20 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-600 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(0,0,0,0.1)_100%)]"></div>
        <div className="relative container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-semibold text-white mb-6">
            Time for a social media tool
            <br />
            <span className="text-slate-200">you actually like*</span>
          </h2>
          <p className="text-xl text-slate-200 mb-12 max-w-2xl mx-auto">
            *30,000+ marketers approve this message. Join them and transform
            your social media workflow today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg font-medium shadow-md hover:shadow-lg transition-all smooth-transition optimized-animation"
            >
              Start your free trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white hover:text-slate-700 px-8 py-4 text-lg font-medium transition-all smooth-transition optimized-animation"
            >
              <Play className="mr-2 w-5 h-5" />
              Watch demo
            </Button>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="relative group">
          <Button
            size="lg"
            className={`bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 shadow-xl hover:shadow-2xl transition-all transform hover:scale-110 animate-pulse-light`}
          >
            <MessageSquare className="w-6 h-6" />
          </Button>

          {/* Floating tooltip */}
          <div className="absolute bottom-full right-0 mb-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
            Need help? Chat with us!
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>

          {/* Floating dots animation */}
          <div
            className={`absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full animate-fade-light`}
          ></div>
          <div
            className={`absolute -bottom-2 -left-2 w-3 h-3 bg-yellow-400 rounded-full animate-fade-light delay-1000`}
          ></div>
        </div>
      </div>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-5 gap-8 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  SocioFly
                </span>
              </div>
              <p className="text-gray-400 text-lg mb-6 max-w-md">
                The command center for modern marketing teams. Plan, create,
                collaborate, and publish with confidence.
              </p>
              <div className="flex space-x-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <MessageSquare className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <Heart className="w-5 h-5" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg">Product</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Integrations
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    API
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg">Solutions</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    For agencies
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Multi-location brands
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Enterprise
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Startups
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-6 text-lg">Resources</h3>
              <ul className="space-y-3 text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Community
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white transition-colors">
                    Status
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 mb-4 md:mb-0">
              © 2025 SocioFly. All rights reserved.
            </p>
            <div className="flex space-x-6 text-gray-400">
              <Link href="#" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Terms
              </Link>
              <Link href="#" className="hover:text-white transition-colors">
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
