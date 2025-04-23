const welcomeTemplate = (subject, body, firstName) => {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      body {
        font-family: 'Arial', sans-serif;
        margin: 0;
        padding: 0;
        background-color: #f4f7fb;
        color: #444;
      }
      .email-container {
        max-width: 700px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      }
      .email-header {
        background-color: #0195f7;
        color: #ffffff;
        padding: 35px 20px;
        text-align: center;
        border-top-left-radius: 8px;
        border-top-right-radius: 8px;
      }
      .email-header h1 {
        margin: 0;
        font-size: 32px;
        font-weight: 700;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
      .email-body {
        padding: 40px 20px;
        font-size: 16px;
        line-height: 1.75;
        color: #555;
      }
      .email-body p {
        margin-bottom: 20px;
      }
      .cta-button {
        display: inline-block;
        margin-top: 30px;
        padding: 14px 30px;
        background-color: #0195f7;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
        text-decoration: none;
        border-radius: 50px;
        text-align: center;
        transition: background-color 0.3s ease;
      }
      .cta-button:hover {
        background-color: #0178c5;
      }
      .email-footer {
        text-align: center;
        padding: 20px;
        background-color: #f4f7fb;
        color: #888;
        font-size: 14px;
        border-bottom-left-radius: 8px;
        border-bottom-right-radius: 8px;
      }
      .email-footer a {
        color: #0195f7;
        text-decoration: none;
      }
      .footer-note {
        font-size: 12px;
        color: #aaa;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="email-header">
        <h1>${subject}</h1>
      </div>
      <div class="email-body">
        <p>Dear ${firstName},</p>
        <p>${body}</p>
        <a href="https://your-crm-link.com" class="cta-button">Log In to CRM</a>
        <p>We are thrilled to have you join our community and look forward to supporting your journey.</p>
        <p>Best regards,<br/>The [Your Company] Team</p>
      </div>
      <div class="email-footer">
        <p>This email was sent automatically. Please do not reply directly to this message.</p>
        <p>
          <a href="https://your-crm-link.com">Visit Our Website</a> |
          <a href="mailto:support@yourcompany.com">Contact Support</a>
        </p>
        <p class="footer-note">If you no longer wish to receive emails, please unsubscribe here.</p>
      </div>
    </div>
  </body>
  </html>
  `;
};

module.exports = welcomeTemplate;
