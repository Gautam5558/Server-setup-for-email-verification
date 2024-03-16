import nodemailer from "nodemailer";
import path from "path";
import getDirname from "../utils/dirname.js";
import ejs from "ejs";

export const sendMail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, template, subject, data } = options;

  // get the path to email template file

  let __dirname = getDirname(import.meta.url);

  __dirname = __dirname
    .replace(/\\/g, "/")
    .replace(/\/controllers$/, "/controllers/");

  const templatePath = path.join(__dirname, "../mails", template);

  // Render the email template with ejs
  const html = await ejs.renderFile(templatePath, data);

  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};
