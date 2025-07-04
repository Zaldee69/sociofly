"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

interface UpgradeOverlayProps {
  title: string;
  description: string;
  features?: string[];
  children: React.ReactNode;
  showOverlay: boolean;
}

export default function UpgradeOverlay({
  title,
  description,
  features = [],
  children,
  showOverlay,
}: UpgradeOverlayProps) {
  if (!showOverlay) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Background content (blurred/dimmed) */}
      <div className="relative">
        <div className="blur-sm opacity-40 pointer-events-none">{children}</div>
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent" />
      </div>

      {/* Upgrade prompt */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <Card className="max-w-md mx-auto bg-background/95 backdrop-blur-sm border-2 border-primary/20 shadow-2xl">
          <CardContent className="p-6 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-purple-600/20 rounded-full blur-2xl opacity-60 animate-pulse" />
              <div className="relative bg-gradient-to-r from-primary to-purple-600 rounded-full p-3 w-16 h-16 mx-auto flex items-center justify-center">
                <Crown className="h-6 w-6 text-white" />
              </div>
            </div>

            <Badge variant="secondary" className="mb-3">
              <Zap className="h-3 w-3 mr-1" />
              Pro Feature
            </Badge>

            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>

            <p className="text-muted-foreground mb-4 text-sm leading-relaxed">
              {description}
            </p>

            {features.length > 0 && (
              <div className="mb-4">
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {features.slice(0, 3).map((feature, index) => (
                    <li
                      key={index}
                      className="flex items-center justify-center"
                    >
                      <TrendingUp className="h-3 w-3 mr-2 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button asChild size="sm">
                <Link href="/billing">
                  <Crown className="h-3 w-3 mr-2" />
                  Upgrade Now
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm">
                <Link href="/billing">View Plans</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
