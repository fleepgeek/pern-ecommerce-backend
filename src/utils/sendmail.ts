import transporter from "../config/nodemailer";

export const sendVerificationEmail = async (
  email: string,
  name: string,
  verificationToken: string,
  verifcationURL = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`
) => {
  //   const canSendMail = await transporter.verify();
  //   console.log(canSendMail);
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "Verify your MERN ECOMMERCE account", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <p>Hello ${name}</p>
      <b>Click the following link to verify your email address: <a href="${verifcationURL}">Verify Email</a></b>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendWelcomeEmail = async (email: string, name: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "Welcome to MERN ECOMMERCE", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <h1>Welcome to MERN ECOMMERCE</h1>
      <b>Hello ${name}, welcome to your new ecommerce exprience.</b>
      <b><a href="${process.env.FRONTEND_URL}">Visit site</a></b>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendPasswordChangedEmail = async (email: string, name: string) => {
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[MERN ECOMMERCE] Your password has changed", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <b>Hello ${name}</b>
      <b>If you did not perform this action, you can recover access by entering ${email} into the reset password form at <a href="${process.env.FRONTEND_URL}/reset-password">MERN COMMERCE</a></b><br/>
      <b>Please do not reply to this email with your password. We will never ask for your password, and we strongly discourage you from sharing it with anyone.</b>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  token: string,
  resetURL = `${process.env.FRONTEND_URL}/reset-password/${token}`
) => {
  try {
    const info = await transporter.sendMail({
      from: `"MERN ECOMMERCE" <${process.env.GOOGLE_APP_EMAIL}>`, // sender address
      to: `${email}`, // list of receivers
      subject: "[MERN ECOMMERCE] Reset your password", // Subject line
      //   text: `Click the `, // plain text body
      html: `
      <b>Hello ${name}</b><br/>
      <b>Reset your password by clicking <a href="${resetURL}">this link</a>.</b>
      <b>If you did not perform this action, you can ignore this message.</b><br/>
      `, // html body
    });

    console.log("Message sent: %s", info.messageId);
  } catch (error) {
    console.error("Error while sending mail", error);
  }
};
