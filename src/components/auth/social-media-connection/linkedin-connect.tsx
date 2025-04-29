import { useAuthStore } from "@/lib/stores/use-auth-store";
import { Linkedin } from "lucide-react";
import Link from "next/link";
import { Button } from "../../ui/button";
import { Badge } from "../../ui/badge";
import { useSocialAccount } from "@/hooks/use-social-account";

export function LinkedInConnectButton() {
  const client = useAuthStore();
  const { account, isLoading, error } = useSocialAccount(
    client.user,
    "linkedin"
  );

  const linkedinAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.NEXT_PUBLIC_LINKEDIN_CLIENT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_LINKEDIN_REDIRECT_URI}&state=${client.user?.id}&scope=r_liteprofile,r_emailaddress,w_member_social`;

  return (
    <div className="flex items-center px-4 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent/50">
      <Linkedin className="mr-3 h-5 w-5 text-[#0077B5]" />
      <span>LinkedIn</span>

      {account ? (
        <Badge className="ml-auto bg-green-100 text-green-800 text-xs">
          Connected
        </Badge>
      ) : (
        <Link className="ml-auto" href={linkedinAuthUrl}>
          <Button variant="outline" size="sm" className="h-6 text-xs">
            Connect
          </Button>
        </Link>
      )}
    </div>
  );
}
