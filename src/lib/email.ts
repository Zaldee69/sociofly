import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendInvitationEmail(email: string, token: string) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`;

  try {
    await resend.emails.send({
      from: "SocioFly <onboarding@resend.dev>",
      to: "muhammadrizaldy19@gmail.com",
      subject: "Undangan Bergabung dengan Tim di SocioFly",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Undangan Tim SocioFly</h2>
          <p>Anda telah diundang untuk bergabung dengan tim di SocioFly!</p>
          <p>Klik tombol di bawah ini untuk menerima undangan:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" 
               style="background-color: #0070f3; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold;">
              Terima Undangan
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            Jika tombol di atas tidak berfungsi, copy dan paste link berikut ke browser Anda:<br>
            ${inviteUrl}
          </p>
          <p style="color: #666; font-size: 14px;">
            Link undangan ini akan kadaluarsa dalam 7 hari.
          </p>
        </div>
      `,
      text: `
        Undangan Tim SocioFly

        Anda telah diundang untuk bergabung dengan tim di SocioFly!
        
        Klik link berikut untuk menerima undangan:
        ${inviteUrl}
        
        Link undangan ini akan kadaluarsa dalam 7 hari.
      `,
    });

    console.log("Email sent successfully", email, token);
    return true;
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return false;
  }
}
