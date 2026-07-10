/**
 * hCaptcha verification middleware.
 *
 * Uses HCAPTCHA_SECRET_KEY env var.
 * Falls back to the official hCaptcha test secret key so verification
 * works out-of-the-box without any account setup.
 *
 * Test credentials (always pass):
 *   Site key : 10000000-ffff-ffff-ffff-000000000001
 *   Secret   : 0x0000000000000000000000000000000000000000
 */
export const verifyCaptcha = async (req, res, next) => {
  // Use real secret if set, otherwise fall back to the hCaptcha test secret
  const secret =
    process.env.HCAPTCHA_SECRET_KEY ||
    '0x0000000000000000000000000000000000000000';

  const token = req.body?.captchaToken;
  if (!token) {
    return res.status(400).json({ message: 'CAPTCHA token is required' });
  }

  try {
    const params = new URLSearchParams({ secret, response: token });

    const verifyRes = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await verifyRes.json();

    if (!data.success) {
      console.error('hCaptcha verification failed:', data['error-codes']);
      return res
        .status(400)
        .json({ message: `CAPTCHA verification failed: ${data['error-codes']?.join(', ') || 'unknown error'}` });
    }
    return next();
  } catch (err) {
    console.error('hCaptcha service error:', err);
    return res.status(500).json({ message: 'CAPTCHA service unavailable' });
  }
};
