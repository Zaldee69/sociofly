import { EmailTemplate } from "../../../components/email-template";
import { Resend } from "resend";

// Initialize Resend only when needed to avoid build-time execution
function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function POST() {
  try {
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: ["muhammadrizaldy19@gmail.com"],
      subject: "Hello world",
      react: await EmailTemplate({ firstName: "John" }),
    });

    if (error) {
      return Response.json({ error }, { status: 500 });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error }, { status: 500 });
  }
}
