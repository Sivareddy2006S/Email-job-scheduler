const nodemailer = require('nodemailer');
async function test() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: 'ayana.hauck35@ethereal.email', pass: 'TATvqqsWSMCZZPdNVf' },
  });
  try {
    await transporter.verify();
    console.log("Success");
  } catch (e) {
    console.error("Error:", e.message);
  }
}
test();
