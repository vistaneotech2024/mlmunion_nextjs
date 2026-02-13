import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, email, url, token, otp } = await req.json();

    // Validate required fields
    if (!type || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type and email" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Handle password reset, signup verification, and OTP emails
    if (type !== "password_reset" && type !== "signup" && type !== "password_reset_otp") {
      return new Response(
        JSON.stringify({ error: "This function only handles password reset, signup, and OTP emails" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate OTP for password reset OTP type
    if (type === "password_reset_otp" && !otp) {
      return new Response(
        JSON.stringify({ error: "OTP code is required for password reset OTP emails" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create email template based on type
    const isSignup = type === "signup";
    const isOTP = type === "password_reset_otp";
    
    // Use new template for OTP emails
    const emailHtml = isOTP ? `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Reset Your mlmunion.in Password</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#eef2ff; font-family:Arial, Helvetica, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef2ff; padding:30px 0;">
    <tr>
      <td align="center">

        <!-- Main Container -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border-radius:8px; box-shadow:0 6px 16px rgba(30,27,75,0.08); overflow:hidden;">
          
          <!-- Header -->
          <tr>
            <td style="padding:30px 40px; background-color:#312e81; color:#ffffff;">
              <h1 style="margin:0; font-size:22px; font-weight:600; letter-spacing:0.3px;">
                MLM Union
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px; color:#1f2937; line-height:1.65;">
              <h2 style="margin-top:0; font-size:20px; font-weight:600; color:#1e1b4b;">
                Reset your password
              </h2>

              <p>
                We received a request to reset the password associated with your
                <strong>MLM Union</strong> account.
              </p>

              <p>
                To proceed, please use the OTP code below to verify your identity and set a new password.
              </p>

              <!-- OTP Code Display -->
              <p style="text-align:center; margin:36px 0;">
                <span style="display:inline-block; padding:20px 40px; background-color:#4f46e5; color:#ffffff; font-size:32px; font-weight:bold; letter-spacing:8px; border-radius:8px; font-family:'Courier New', monospace;">
                  ${otp || '000000'}
                </span>
              </p>

              <p style="margin-top:24px; padding:16px; background-color:#f1f5ff; border-radius:6px; border-left:4px solid #4f46e5;">
                <strong style="color:#1e1b4b;">Important:</strong> This OTP code will expire in 10 minutes. Enter this code on the password reset page to continue.
              </p>

              <p>
                If you did not request a password reset, please ignore this email.
                Your account will remain secure.
              </p>

              <p style="margin-top:32px;">
                With regards,<br />
                <strong>Support Team</strong><br />
                MLM Union
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px; background-color:#f1f5ff; color:#6b7280; font-size:12px; text-align:center;">
              <p style="margin:0;">
                Need assistance? Contact us at
                <a href="mailto:support@mlmunion.in" style="color:#4f46e5; text-decoration:none;">
                  support@mlmunion.in
                </a>
              </p>
              <p style="margin:8px 0 0;">
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Container -->

      </td>
    </tr>
  </table>

</body>
</html>
    ` : `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${isSignup ? "Verify Your Email - MLM Union" : "Reset Your Password - MLM Union Account Security"}</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f9fafb;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #e5e7eb;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #4f46e5;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px 0;
        }
        .button {
          display: inline-block;
          background-color: #4f46e5;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
        }
        .button:hover {
          background-color: #4338ca;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #6b7280;
        }
        .note {
          background-color: #f3f4f6;
          padding: 15px;
          border-radius: 6px;
          margin: 20px 0;
        }
        .note-title {
          font-weight: 600;
          margin-bottom: 5px;
        }
        ul {
          padding-left: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MLM Union</div>
          <h1>${isSignup ? "Verify Your Email Address" : "Reset Your Password"}</h1>
        </div>
        <div class="content">
          <p>Dear User,</p>
          ${isSignup 
            ? `<p>Thank you for signing up for MLM Union! To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center;">
            <a href="${url}" class="button">Verify Email Address</a>
          </div>
          
          <div class="note">
            <div class="note-title">Important notes:</div>
            <ul>
              <li>This verification link will expire in 24 hours</li>
              <li>If you didn't create an account with MLM Union, please ignore this email</li>
              <li>After verification, you'll be able to sign in to your account</li>
            </ul>
          </div>
          
          <p>Welcome to MLM Union! We're excited to have you join our community.</p>
          
          <p>Best regards,<br>MLM Union Team</p>`
            : `<p>You recently requested to reset your password for your MLM Union account. To ensure the security of your account, please follow these steps:</p>
          
          <div style="text-align: center;">
            <a href="${url}" class="button">Reset Password</a>
          </div>
          
          <div class="note">
            <div class="note-title">Important notes:</div>
            <ul>
              <li>This link will expire in 24 hours</li>
              <li>For security reasons, please create a strong password that:
                <ul>
                  <li>Is at least 8 characters long</li>
                  <li>Contains uppercase and lowercase letters</li>
                  <li>Includes numbers and special characters</li>
                </ul>
              </li>
              <li>If you didn't request this password reset, please ignore this email and contact support immediately</li>
            </ul>
          </div>
          
          <p>Need help? Contact our support team at support@mlmunion.com</p>
          
          <p>Best regards,<br>MLM Union Security Team</p>`
          }
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} MLM Union. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Get email service configuration
    // Option 1: Use Resend (recommended - free tier available)
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    // Option 2: Use SMTP (if configured)
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");
    const smtpFrom = Deno.env.get("SMTP_FROM") || "noreply@mlmunion.in";

    const subject = isSignup 
      ? "Verify Your Email - MLM Union" 
      : isOTP
      ? "Password Reset OTP - MLM Union"
      : "Reset Your Password - MLM Union Account Security";

    console.log("Sending email to:", email);
    console.log("Email type:", type);

    // Try Resend first (recommended)
    if (resendApiKey) {
      try {
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: smtpFrom || "MLM Union <noreply@mlmunion.in>",
            to: email,
            subject: subject,
            html: emailHtml,
          }),
        });

        const resendData = await resendResponse.json();

        if (!resendResponse.ok) {
          console.error("Resend API error:", resendData);
          throw new Error(`Resend failed: ${resendData.message || JSON.stringify(resendData)}`);
        }

        console.log("Email sent successfully via Resend:", resendData.id);
        return new Response(
          JSON.stringify({ message: isSignup ? "Verification email sent successfully" : isOTP ? "OTP email sent successfully" : "Password reset email sent successfully" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } catch (resendError: any) {
        console.error("Resend error:", resendError);
        throw new Error(`Failed to send email via Resend: ${resendError.message}`);
      }
    }

    // Fallback: Try SMTP if configured
    if (smtpHost && smtpUser && smtpPassword) {
      // SMTP implementation would go here
      // For now, we'll throw an error asking to configure Resend
      throw new Error("SMTP not yet implemented. Please configure RESEND_API_KEY in Edge Function secrets.");
    }

    // No email service configured
    throw new Error("No email service configured. Please set RESEND_API_KEY in Edge Function secrets. Get free API key at https://resend.com");

    return new Response(
      JSON.stringify({ message: isSignup ? "Verification email sent successfully" : isOTP ? "OTP email sent successfully" : "Password reset email sent successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in custom-email function:", error);
    const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});