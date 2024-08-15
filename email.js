const nodemailer = require('nodemailer');

async function sendEmail(to, username) {
    // Create a transporter object using SMTP transport
    let transporter = nodemailer.createTransport({
        service: 'gmail', // You can use any email service like 'hotmail', 'yahoo', etc.
        auth: {
            user: process.env.EMAIL_USER, // Your email address from environment variables
            pass: process.env.EMAIL_PASS,  // Your email password from environment variables
        },
    });

    // Modern and Minimalist HTML Content
    const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4; color: #333;">
            <header style="padding-bottom: 20px; border-bottom: 1px solid #ddd;">
                <h1 style="font-size: 24px; font-weight: bold; color: #2C3E50; text-align: center;">Dicompos</h1>
            </header>
            <main style="padding-top: 20px;">
                <p style="font-size: 18px; color: #2C3E50;">Dear ${username},</p>
                <p style="font-size: 16px; line-height: 1.6; color: #555;">
                    Your compost has reached its maturation phase. Therefore, you're free to stop the composting process.
                </p>
            </main>
            <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center;">
                <p style="font-size: 14px; color: #777;">Best regards,<br>Dicompos</p>
            </footer>
        </div>
    `;

    // Setup email data
    let mailOptions = {
        from: `"Dicompos" <${process.env.EMAIL_USER}>`, // Sender address
        to: to,                                          // List of recipients
        subject: 'Compost Maturation Notification',      // Subject line
        html: htmlContent,                               // HTML body content
    };

    // Send email with defined transport object
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
    } catch (error) {
        console.error('Error sending email:', error);
    }
}

// Usage
sendEmail('hiskandaryapis@gmail.com', 'Hari');