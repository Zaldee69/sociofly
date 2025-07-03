import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { BillingCycle } from "@prisma/client";

/**
 * Calculate subscription expiration date based on billing cycle
 */
function calculateExpirationDate(billingCycle: BillingCycle): Date {
  const now = new Date();
  const expirationDate = new Date(now);

  if (billingCycle === "YEARLY") {
    expirationDate.setFullYear(now.getFullYear() + 1);
  } else {
    // Default to monthly
    expirationDate.setMonth(now.getMonth() + 1);
  }

  return expirationDate;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Extract data from Midtrans notification payload
    const orderId = body.order_id;
    const transactionStatus = body.transaction_status;
    const fraudStatus = body.fraud_status;
    const signatureKey = body.signature_key;
    const grossAmount = body.gross_amount;
    const paymentType = body.payment_type;

    console.log(
      `[MIDTRANS WEBHOOK] Notification received:
      Order ID: ${orderId}
      Status: ${transactionStatus}
      Fraud: ${fraudStatus}
      Amount: ${grossAmount}
      Payment Type: ${paymentType}`
    );

    // Find the transaction in our database
    const transaction = await prisma.transaction.findUnique({
      where: { midtransOrderId: orderId },
      include: {
        user: true,
      },
    });

    if (!transaction) {
      console.error(
        `[MIDTRANS WEBHOOK] Transaction with order ID ${orderId} not found.`
      );
      return NextResponse.json(
        { message: "Transaction not found" },
        { status: 404 }
      );
    }

    console.log(
      `[MIDTRANS WEBHOOK] Found transaction:
      User ID: ${transaction.userId}
      Plan: ${transaction.plan}
      Billing Cycle: ${transaction.billingCycle}
      Amount: ${transaction.amount}
      Current Status: ${transaction.status}`
    );

    // Handle successful payment
    const handleSuccessfulPayment = async () => {
      try {
        // Calculate subscription expiration date
        const expirationDate = calculateExpirationDate(
          transaction.billingCycle
        );

        // Update transaction status
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "SUCCESS",
            updatedAt: new Date(),
            paymentDetails: JSON.stringify({
              paymentType,
              transactionStatus,
              fraudStatus,
              grossAmount,
              ...body,
            }),
          },
        });

        // Update user's subscription details
        await prisma.user.update({
          where: { id: transaction.userId },
          data: {
            subscriptionPlan: transaction.plan,
            subscriptionExpiresAt: expirationDate,
            subscriptionUpdatedAt: new Date(),
            subscriptionActive: true,
          },
        });

        console.log(
          `[MIDTRANS WEBHOOK] User ${transaction.userId} subscription updated:
          Plan: ${transaction.plan}
          Billing Cycle: ${transaction.billingCycle}
          Expires: ${expirationDate}
          Transaction Status: SUCCESS`
        );
        return true;
      } catch (error) {
        console.error(
          "[MIDTRANS WEBHOOK] Error handling successful payment:",
          error
        );
        return false;
      }
    };

    // Process transaction based on status
    if (transactionStatus === "capture") {
      if (fraudStatus === "challenge") {
        // Payment is challenged (potential fraud)
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: "PENDING",
            updatedAt: new Date(),
            paymentDetails: JSON.stringify({
              paymentType,
              transactionStatus,
              fraudStatus,
              grossAmount,
              ...body,
            }),
          },
        });
        console.log(
          `[MIDTRANS WEBHOOK] Transaction ${orderId} marked as PENDING due to fraud challenge`
        );
      } else if (fraudStatus === "accept") {
        // Payment is successful and accepted
        const success = await handleSuccessfulPayment();
        console.log(
          `[MIDTRANS WEBHOOK] Transaction ${orderId} processed successfully: ${success}`
        );
      }
    } else if (transactionStatus === "settlement") {
      // Payment is settled (successful)
      const success = await handleSuccessfulPayment();
      console.log(
        `[MIDTRANS WEBHOOK] Transaction ${orderId} settled successfully: ${success}`
      );
    } else if (
      transactionStatus === "cancel" ||
      transactionStatus === "deny" ||
      transactionStatus === "expire"
    ) {
      // Payment failed
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "FAILED",
          updatedAt: new Date(),
          paymentDetails: JSON.stringify({
            paymentType,
            transactionStatus,
            fraudStatus,
            grossAmount,
            ...body,
          }),
        },
      });
      console.log(`[MIDTRANS WEBHOOK] Transaction ${orderId} marked as FAILED`);
    } else if (transactionStatus === "pending") {
      // Payment is pending
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "PENDING",
          updatedAt: new Date(),
          paymentDetails: JSON.stringify({
            paymentType,
            transactionStatus,
            fraudStatus,
            grossAmount,
            ...body,
          }),
        },
      });
      console.log(
        `[MIDTRANS WEBHOOK] Transaction ${orderId} marked as PENDING`
      );
    }

    return NextResponse.json({ message: "OK" }, { status: 200 });
  } catch (error) {
    console.error("[MIDTRANS WEBHOOK] Error processing webhook:", error);
    return NextResponse.json(
      { message: "Error processing webhook" },
      { status: 500 }
    );
  }
}
