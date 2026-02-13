import nodemailer from "nodemailer";
import "dotenv/config";

export const sendMail = async (email: string, subject: string, text: string): Promise<void> => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST as string,
      port: parseInt(process.env.MAIL_PORT as string, 10),
      secure: process.env.MAIL_SECURE === 'true',
      auth: {
        user: process.env.MAIL_EMAIL,
        pass: process.env.MAIL_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: { address: process.env.MAIL_EMAIL as string, name: process.env.MAIL_NAME as string },
      to: email,
      subject: subject,
      text: text,
    });
    console.log("Email sent successfully");
  } catch (error) {
    console.error(error);
  }
};
