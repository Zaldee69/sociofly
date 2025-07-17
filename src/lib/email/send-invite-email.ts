import { Resend } from "resend";

// Initialize Resend only when needed to avoid build-time execution
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface SendInviteEmailParams {
  email: string;
  teamName: string;
  role: string;
}

export async function sendInviteEmail({
  email,
  teamName,
  role,
}: SendInviteEmailParams) {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: "Sociofly <onboarding@resend.dev>",
      to: email,
      subject: `You're invited to join ${teamName} on Sociofly`,
      text:
        `You have been invited to join ${teamName} on Sociofly as a ${role.toLowerCase()}.\n\n` +
        `If you already have an account, you can view and manage your invitations at:\n` +
        `${process.env.NEXT_PUBLIC_APP_URL}/invites\n\n` +
        `If you don't have an account yet, sign up first at:\n` +
        `${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-up\n\n` +
        `After signing up or logging in, visit the invitations page to accept or decline this invitation.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">Team Invitation</h2>
            <p>You have been invited to join <strong>${teamName}</strong> on Sociofly as a <strong>${role.toLowerCase()}</strong>.</p>
          
          <div style="margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/invites" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">View Invitation</a>
          </div>
          
          <p style="color: #666; margin-top: 30px; font-size: 14px;">
            If you already have an account, clicking the button will take you to your invitations page.<br>
            If you don't have an account yet, please <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/sign-up" style="color: #4f46e5;">sign up first</a> and then visit the invitations page.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="color: #999; font-size: 12px;">
            If you didn't expect to receive this invitation, you can safely ignore this email.
          </p>
        </div>
      `,
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
