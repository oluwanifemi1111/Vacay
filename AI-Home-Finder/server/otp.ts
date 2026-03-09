import twilio from "twilio";

export interface OTPData {
  id: string;
  phone: string;
  otp: string;
  attempts: number;
  isVerified: boolean;
  createdAt: Date;
  expiresAt: Date;
  resendCount: number;
  lastResendAt: Date | null;
}

// In-memory OTP store (use database for production)
const otpStore = new Map<string, OTPData>();

// Initialize Twilio client
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(phone: string): Promise<OTPData> {
  const otp = generateOTP();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60000); // 5 minutes
  
  const otpData: OTPData = {
    id: Math.random().toString(36).substring(7),
    phone,
    otp,
    attempts: 0,
    isVerified: false,
    createdAt: now,
    expiresAt,
    resendCount: 0,
    lastResendAt: null,
  };
  
  otpStore.set(phone, otpData);
  
  // Send SMS via Twilio
  try {
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Your verification code is ${otp}. This code will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`[Twilio OTP] SMS sent to ${phone}`);
    } else {
      // Fallback for development without Twilio configured
      console.log(`[OTP (Dev Mode)] To ${phone}: Your verification code is ${otp}. Expires in 5 minutes.`);
    }
  } catch (error) {
    console.error("Failed to send OTP via Twilio:", error);
    throw new Error("Failed to send OTP");
  }
  
  return otpData;
}

export function verifyOTP(phone: string, otp: string): boolean {
  const otpData = otpStore.get(phone);
  
  if (!otpData) return false;
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(phone);
    return false;
  }
  if (otpData.attempts >= 3) return false;
  
  otpData.attempts++;
  
  if (otpData.otp === otp) {
    otpData.isVerified = true;
    return true;
  }
  
  return false;
}

export function canResendOTP(phone: string): boolean {
  const otpData = otpStore.get(phone);
  
  if (!otpData) return true; // Can create new OTP
  
  // Check if expired
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(phone);
    return true;
  }
  
  // Check resend limit (max 3 resends)
  if (otpData.resendCount >= 3) return false;
  
  // Check resend cooldown (60 seconds between resends)
  if (otpData.lastResendAt) {
    const timeSinceLastResend = new Date().getTime() - otpData.lastResendAt.getTime();
    if (timeSinceLastResend < 60000) return false; // Too soon
  }
  
  return true;
}

export async function resendOTP(phone: string): Promise<OTPData | null> {
  const otpData = otpStore.get(phone);
  
  if (!otpData) return null;
  
  if (!canResendOTP(phone)) {
    return null;
  }
  
  // Update resend tracking
  otpData.resendCount++;
  otpData.lastResendAt = new Date();
  otpData.attempts = 0; // Reset attempts on resend
  
  // Resend SMS
  try {
    if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
      await twilioClient.messages.create({
        body: `Your verification code is ${otpData.otp}. This code will expire in 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });
      console.log(`[Twilio OTP] Resent SMS to ${phone} (attempt ${otpData.resendCount})`);
    } else {
      console.log(`[OTP (Dev Mode)] Resent to ${phone}: ${otpData.otp}`);
    }
  } catch (error) {
    console.error("Failed to resend OTP via Twilio:", error);
    throw new Error("Failed to resend OTP");
  }
  
  return otpData;
}

export function getOTP(phone: string): OTPData | null {
  const otpData = otpStore.get(phone);
  if (!otpData) return null;
  if (new Date() > otpData.expiresAt) {
    otpStore.delete(phone);
    return null;
  }
  return otpData;
}

export function clearOTP(phone: string): void {
  otpStore.delete(phone);
}
