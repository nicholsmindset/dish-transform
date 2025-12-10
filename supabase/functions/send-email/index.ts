import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || "Dish Transform <noreply@dishtransform.com>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  data: Record<string, any>;
}

// Email templates
const templates: Record<string, (data: any) => { html: string; text: string }> = {
  welcome: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ea580c, #15803d); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Dish Transform!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Thank you for joining Dish Transform! We're excited to help you create stunning, professional food photography.</p>
              <p>Here's what you can do now:</p>
              <ul>
                <li>Upload your first dish photo</li>
                <li>Get 3 professional style variations</li>
                <li>Export for social media or your menu</li>
              </ul>
              <a href="${data.dashboardUrl || 'https://dishtransform.com/dashboard'}" class="button">Go to Dashboard</a>
              <p>If you have any questions, just reply to this email!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Dish Transform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to Dish Transform!\n\nHi ${data.name || 'there'},\n\nThank you for joining! Visit your dashboard to get started: ${data.dashboardUrl || 'https://dishtransform.com/dashboard'}\n\nBest,\nThe Dish Transform Team`,
  }),

  purchase_confirmation: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ea580c, #15803d); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .order-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Purchase Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Thank you for your purchase! Here are your order details:</p>
              <div class="order-box">
                <p><strong>Package:</strong> ${data.packageName}</p>
                <p><strong>Images:</strong> ${data.imagesCount}</p>
                <p><strong>Amount:</strong> S$${data.amount}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
              <p>Your credits have been added to your account and are ready to use!</p>
              <a href="${data.dashboardUrl || 'https://dishtransform.com/dashboard'}" class="button">Start Enhancing Photos</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Dish Transform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Purchase Confirmed!\n\nPackage: ${data.packageName}\nImages: ${data.imagesCount}\nAmount: S$${data.amount}\n\nYour credits are ready to use!\n\nVisit: ${data.dashboardUrl || 'https://dishtransform.com/dashboard'}`,
  }),

  subscription_started: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ea580c, #15803d); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .plan-box { background: white; border: 2px solid #ea580c; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .plan-box h2 { color: #ea580c; margin: 0 0 10px 0; }
            .perks { list-style: none; padding: 0; margin: 20px 0; }
            .perks li { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .perks li:last-child { border-bottom: none; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ${data.planName}!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Your subscription is now active! Here's what's included:</p>
              <div class="plan-box">
                <h2>${data.planName}</h2>
                <p>${data.imagesPerMonth} images per month</p>
                ${data.socialPosts > 0 ? `<p>${data.socialPosts} social posts per month</p>` : ''}
              </div>
              <p><strong>Your subscriber perks:</strong></p>
              <ul class="perks">
                <li>✓ Locked-in pricing - your rate never increases</li>
                <li>✓ Rollover unused images (up to 5)</li>
                <li>✓ Free re-edits on any photo</li>
                <li>✓ ${data.priority ? '24-hour priority' : '48-hour'} turnaround</li>
              </ul>
              <a href="${data.dashboardUrl || 'https://dishtransform.com/dashboard'}" class="button">Go to Dashboard</a>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Dish Transform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Welcome to ${data.planName}!\n\nYour subscription includes:\n- ${data.imagesPerMonth} images per month\n${data.socialPosts > 0 ? `- ${data.socialPosts} social posts per month\n` : ''}\nSubscriber perks:\n- Locked-in pricing\n- Rollover unused images (up to 5)\n- Free re-edits\n- ${data.priority ? '24-hour priority' : '48-hour'} turnaround\n\nVisit: ${data.dashboardUrl || 'https://dishtransform.com/dashboard'}`,
  }),

  photos_ready: (data) => ({
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ea580c, #15803d); padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .header h1 { color: white; margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #ea580c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Photos Are Ready!</h1>
            </div>
            <div class="content">
              <p>Hi ${data.name || 'there'},</p>
              <p>Great news! Your ${data.photoCount} enhanced photo${data.photoCount > 1 ? 's are' : ' is'} ready for download.</p>
              <p>Each photo includes 3 professional style variations:</p>
              <ul>
                <li>Clean White Background</li>
                <li>Rustic Table Setting</li>
                <li>Dark Moody Background</li>
              </ul>
              <a href="${data.dashboardUrl || 'https://dishtransform.com/dashboard'}" class="button">View & Download</a>
              <p>Not satisfied? Reply to this email and we'll make it right!</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Dish Transform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Your Photos Are Ready!\n\nYour ${data.photoCount} enhanced photo${data.photoCount > 1 ? 's are' : ' is'} ready for download.\n\nView & Download: ${data.dashboardUrl || 'https://dishtransform.com/dashboard'}`,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "Email service not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { to, subject, template, data }: EmailRequest = await req.json();

    if (!to || !template) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, template" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const templateFn = templates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { html, text } = templateFn(data || {});

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject: subject || getDefaultSubject(template),
        html,
        text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await response.json();
    console.log(`Email sent successfully: ${result.id}`);

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Email error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDefaultSubject(template: string): string {
  const subjects: Record<string, string> = {
    welcome: "Welcome to Dish Transform!",
    purchase_confirmation: "Your Dish Transform Purchase Confirmation",
    subscription_started: "Welcome to Your Dish Transform Subscription!",
    photos_ready: "Your Enhanced Photos Are Ready!",
  };
  return subjects[template] || "Message from Dish Transform";
}
