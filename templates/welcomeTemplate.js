const welcomeTemplate = (name) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body {
        font-family: Arial, sans-serif;
        color: #333;
        margin: 0;
        padding: 0;
        background-color: #f4f7fb;
      }
      .email-wrapper {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background-color: #0195f7;
        color: #ffffff;
        padding: 20px;
        text-align: center;
        border-radius: 8px 8px 0 0;
      }
      .email-header h1 {
        font-size: 24px;
        margin: 0;
      }
      .email-body {
        padding: 20px;
        line-height: 1.6;
      }
      .email-footer {
        text-align: center;
        padding: 15px;
        background-color: #f4f7fb;
        border-radius: 0 0 8px 8px;
        font-size: 12px;
        color: #999;
      }
      .button {
        display: inline-block;
        padding: 10px 20px;
        background-color: #0195f7;
        color: #ffffff;
        text-decoration: none;
        border-radius: 5px;
        margin-top: 20px;
        font-weight: bold;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <div class="email-header">
        <h1>Welcome to Our CRM, ${name}!</h1>
      </div>
      <div class="email-body">
        <p>Hi ${name},</p>
        <p>We're excited to have you on board! You’ve been successfully added to our CRM system, and we’ll keep you updated with relevant information, offers, and more!</p>
        <p>If you have any questions or need assistance, feel free to reach out to us.</p>
        <a href="https://your-crm-link.com" class="button">Log In to CRM</a>
        <p>Thank you for being a part of our community!</p>
        <p>Best regards,</p>
        <p>The CRM Team</p>
      </div>
      <div class="email-footer">
        <p>This is an automated email. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
  </html>
`;

module.exports = welcomeTemplate;
