import twilio from "twilio";

export const sendSms = async (to: string, body: string) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID as string;
  const authToken = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_FROM_NUMBER as string; // Twilio phone number

  const client = twilio(accountSid, authToken);

  return client.messages.create({
    from,
    to,
    body,
  });
};
