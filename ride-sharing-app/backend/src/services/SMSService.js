const twilioClient = require("../config/twilio");
const { TWILIO_FROM_NUMBER } = require("../config/env");

/**
 * sendSMS(phone, message)
 * - for now: logs to console
 * - if Twilio is configured, sends a real SMS
 */
async function sendSMS(phone, message) {
  if (!twilioClient || !TWILIO_FROM_NUMBER) {
    console.log(`📲 [SMS MOCK] To: ${phone} | Message: ${message}`);
    return;
  }

  await twilioClient.messages.create({
    from: TWILIO_FROM_NUMBER,
    to: phone,
    body: message
  });
}

module.exports = { sendSMS };
