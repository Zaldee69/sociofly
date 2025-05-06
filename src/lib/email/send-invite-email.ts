import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendInviteEmailParams {
  email: string;
  organizationName: string;
  role: string;
}

export async function sendInviteEmail({
  email,
  organizationName,
  role,
}: SendInviteEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "My Scheduler App <onboarding@resend.dev>",
      to: "muhammadrizaldy19@gmail.com",
      subject: `You're invited to join ${organizationName} on My Scheduler App`,
      text:
        `You have been invited to join ${organizationName} on My Scheduler App as a ${role.toLowerCase()}.\n\n` +
        `Click the link below to sign up or log in:\n` +
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-up\n\n` +
        `If you already have an account, you can log in at:\n` +
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-in`,
    });

    if (error) {
      console.error("Error sending invitation email:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Failed to send invitation email:", error);
    throw error;
  }
}
