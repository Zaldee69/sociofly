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

// New approval notification functions
interface ApprovalNotificationData {
  approverEmail: string;
  approverName: string;
  postContent: string;
  teamName: string;
  authorName: string;
  assignmentId: string;
}

export async function sendApprovalRequestEmail(data: ApprovalNotificationData) {
  const {
    approverEmail,
    approverName,
    postContent,
    teamName,
    authorName,
    assignmentId,
  } = data;
  const approvalUrl = `${process.env.NEXT_PUBLIC_APP_URL}/approvals?assignment=${assignmentId}`;

  // Truncate content for preview
  const contentPreview =
    postContent.length > 100
      ? postContent.substring(0, 100) + "..."
      : postContent;

  try {
    await resend.emails.send({
      from: "SocioFly <notifications@resend.dev>",
      to: "muhammadrizaldy19@gmail.com",
      subject: `Permintaan Approval Post dari ${authorName} - ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #333; margin-bottom: 20px;">🔔 Permintaan Approval Post</h2>
          
          <p>Halo ${approverName},</p>
          
          <p>Anda memiliki permintaan approval post baru dari <strong>${authorName}</strong> di tim <strong>${teamName}</strong>.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">Preview Konten:</h3>
            <p style="margin: 0; font-style: italic; color: #6c757d;">"${contentPreview}"</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${approvalUrl}" 
               style="background-color: #28a745; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Review & Approve
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Klik tombol di atas untuk melihat detail lengkap dan memberikan approval atau feedback.
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="color: #999; font-size: 12px;">
            Email ini dikirim secara otomatis oleh sistem SocioFly. Jika Anda tidak seharusnya menerima email ini, silakan abaikan.
          </p>
        </div>
      `,
      text: `
        Permintaan Approval Post - ${teamName}

        Halo ${approverName},

        Anda memiliki permintaan approval post baru dari ${authorName} di tim ${teamName}.

        Preview Konten:
        "${contentPreview}"

        Untuk review dan approval, kunjungi:
        ${approvalUrl}

        ---
        Email ini dikirim secara otomatis oleh sistem SocioFly.
      `,
    });

    console.log("Approval request email sent successfully to:", approverEmail);
    return true;
  } catch (error) {
    console.error("Error sending approval request email:", error);
    return false;
  }
}

interface ApprovalStatusNotificationData {
  authorEmail: string;
  authorName: string;
  postContent: string;
  teamName: string;
  approverName: string;
  status: "approved" | "rejected";
  feedback?: string;
}

export async function sendApprovalStatusEmail(
  data: ApprovalStatusNotificationData
) {
  const {
    authorEmail,
    authorName,
    postContent,
    teamName,
    approverName,
    status,
    feedback,
  } = data;
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/posts`;

  const contentPreview =
    postContent.length > 100
      ? postContent.substring(0, 100) + "..."
      : postContent;

  const isApproved = status === "approved";
  const statusText = isApproved ? "Disetujui" : "Ditolak";
  const statusColor = isApproved ? "#28a745" : "#dc3545";
  const statusIcon = isApproved ? "✅" : "❌";

  try {
    await resend.emails.send({
      from: "SocioFly <notifications@resend.dev>",
      // to: authorEmail,
      to: "muhammadrizaldy19@gmail.com",
      subject: `Post Anda ${statusText} oleh ${approverName} - ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: ${statusColor}; margin-bottom: 20px;">${statusIcon} Post ${statusText}</h2>
          
          <p>Halo ${authorName},</p>
          
          <p>Post Anda di tim <strong>${teamName}</strong> telah <strong>${statusText.toLowerCase()}</strong> oleh ${approverName}.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #495057;">Konten Post:</h3>
            <p style="margin: 0; font-style: italic; color: #6c757d;">"${contentPreview}"</p>
          </div>
          
          ${
            feedback
              ? `
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 10px 0; color: #856404;">Feedback:</h3>
            <p style="margin: 0; color: #856404;">${feedback}</p>
          </div>
          `
              : ""
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 24px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
              Lihat Dashboard
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            ${
              isApproved
                ? "Post Anda akan dipublikasikan sesuai jadwal yang telah ditentukan."
                : "Silakan edit post Anda berdasarkan feedback dan submit ulang untuk approval."
            }
          </p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;">
          
          <p style="color: #999; font-size: 12px;">
            Email ini dikirim secara otomatis oleh sistem SocioFly.
          </p>
        </div>
      `,
      text: `
        Post ${statusText} - ${teamName}

        Halo ${authorName},

        Post Anda di tim ${teamName} telah ${statusText.toLowerCase()} oleh ${approverName}.

        Konten Post:
        "${contentPreview}"

        ${feedback ? `Feedback: ${feedback}` : ""}

        Lihat dashboard Anda di: ${dashboardUrl}

        ${
          isApproved
            ? "Post Anda akan dipublikasikan sesuai jadwal yang telah ditentukan."
            : "Silakan edit post Anda berdasarkan feedback dan submit ulang untuk approval."
        }

        ---
        Email ini dikirim secara otomatis oleh sistem SocioFly.
      `,
    });

    console.log(
      `Approval status email sent successfully to: ${authorEmail} (${status})`
    );
    return true;
  } catch (error) {
    console.error("Error sending approval status email:", error);
    return false;
  }
}
