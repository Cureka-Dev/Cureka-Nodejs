/*
 * Mailgun integration
 */

import nodemailer from "nodemailer";

async function sendEmail(data) {
  try {
    var mailOptions = {
      from: "info@cureka.com",
      to: data.to,
      subject: data.subject,
      //text: "Hey there, it’s our first message sent with Nodemailer 😉 ",
      html: data.html,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Message sent: %s", info);
      }
    });
  } catch (error) {
    //logger.error(message.maiSentError, error);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: 'AKIA6ODU4PEU4PV3CWAQ',//process.env.SMTP_USERNAME,
    pass: 'BISt+UN3z2J4myMBaWZ/2gKdRClW1QL998jEWVb1c57j',//process.env.SMTP_PASSWORD
  },
});

export { sendEmail };

