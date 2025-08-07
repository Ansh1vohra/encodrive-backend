const otpStore: Record<string, { otp: number; expiresAt: number }> = {};

export const saveOTP = (email: string, otp: number) => {
  otpStore[email] = {
    otp,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  };
};

export const verifyOTP = (email: string, otp: number): boolean => {
  const record = otpStore[email];
  if (!record) return false;

  const isValid = record.otp === otp && Date.now() < record.expiresAt;

  // Optionally clear it after use
  if (isValid) delete otpStore[email];

  return isValid;
};
