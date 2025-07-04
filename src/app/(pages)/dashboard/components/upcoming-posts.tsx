import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Twitter, Facebook, ArrowRight } from "lucide-react";
import Link from "next/link";

// Mock data for upcoming posts
const upcomingPosts = [
  {
    id: 1,
    platform: "Twitter",
    content:
      "Excited to announce our new feature launch next week! #SaaS #Innovation",
    scheduledTime: "Tomorrow, 10:00 AM",
    icon: Twitter,
  },
  {
    id: 2,
    platform: "Instagram",
    content: "Behind the scenes of our latest team photoshoot. Stay tuned!",
    scheduledTime: "Friday, 3:00 PM",
    icon: Instagram,
  },
  {
    id: 3,
    platform: "Facebook",
    content: "Join our webinar on social media strategy this Thursday.",
    scheduledTime: "Thursday, 1:00 PM",
    icon: Facebook,
  },
];

const UpcomingPosts = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Posts</CardTitle>
        <CardDescription>
          A quick look at what's next in your content calendar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingPosts.map((post) => {
            const Icon = post.icon;
            return (
              <div key={post.id} className="flex items-start gap-4">
                <div className="p-2 bg-slate-100 rounded-full">
                  <Icon className="w-5 h-5 text-slate-600" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-slate-800 break-words">
                    {post.content}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {post.scheduledTime}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-4 text-indigo-600 hover:text-indigo-700"
          asChild
        >
          <Link href="/calendar">
            View Full Calendar
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UpcomingPosts;
