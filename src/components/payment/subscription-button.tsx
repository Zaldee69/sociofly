import { api } from "@/lib/utils/api";
import { BillingPlan } from "@prisma/client";
import { useEffect } from "react";
import { toast } from "sonner";
import { SUBSCRIPTION_PRICES } from "@/config/constants";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    snap: any;
  }
}

interface SubscriptionButtonProps {
  plan: BillingPlan;
  billingCycle?: "MONTHLY" | "YEARLY";
}

export function SubscriptionButton({
  plan,
  billingCycle = "MONTHLY",
}: SubscriptionButtonProps) {
  const router = useRouter();

  const createTransaction = api.payment.createTransaction.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        window.snap.pay(data.token, {
          onSuccess: function (result: any) {
            /* You may add your own implementation here */
            toast.success("Payment successful!");
            console.log(result);
            // Redirect to billing page with success status
            router.push(`/billing?status=success&order_id=${result.order_id}`);
          },
          onPending: function (result: any) {
            /* You may add your own implementation here */
            toast.info("Payment pending.");
            console.log(result);
            // Redirect to billing page with pending status
            router.push(`/billing?status=pending&order_id=${result.order_id}`);
          },
          onError: function (result: any) {
            /* You may add your own implementation here */
            toast.error("Payment failed!");
            console.log(result);
            // Redirect to billing page with error status
            router.push(`/billing?status=error&order_id=${result.order_id}`);
          },
          onClose: function () {
            /* You may add your own implementation here */
            // toast.warning(
            //   "You closed the popup without finishing the payment."
            // );
          },
        });
      } else if (data.message) {
        toast.success(data.message);
        // For free plan, refresh the page to show updated subscription status
        if (plan === "FREE") {
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      }
    },
    onError: (error) => {
      toast.error(`Error creating transaction: ${error.message}`);
    },
  });

  useEffect(() => {
    const midtransUrl =
      process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
      "https://app.sandbox.midtrans.com/snap/snap.js";
    const script = document.createElement("script");
    script.src = midtransUrl;
    script.setAttribute(
      "data-client-key",
      process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || ""
    );
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleClick = () => {
    createTransaction.mutate({ plan, billingCycle });
  };

  const amount = SUBSCRIPTION_PRICES[plan];
  const isPending = createTransaction.isPending;

  if (plan === "FREE") {
    return (
      <div
        className="w-full flex items-center justify-center"
        onClick={handleClick}
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
          </>
        ) : (
          "Start Free Plan"
        )}
      </div>
    );
  }

  return (
    <div
      className="w-full flex items-center justify-center"
      onClick={handleClick}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...
        </>
      ) : (
        `Subscribe Now`
      )}
    </div>
  );
}
