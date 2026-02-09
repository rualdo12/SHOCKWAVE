/**
 * Minimal Yoco charge/token proxy (server-side only).
 *
 * - Keeps the secret key off the frontend.
 * - Expects an incoming payment token (e.g., from Yoco popup) and amount in cents.
 * - Replace the fetch URL/body with the latest Yoco API endpoint you use.
 */

import fetch from 'node-fetch';

const { YOCO_SECRET_KEY } = process.env;

if (!YOCO_SECRET_KEY) {
  throw new Error('YOCO_SECRET_KEY is not set. Configure it in your server environment.');
}

/**
 * Example Express-style handler.
 */
export async function yocoChargeHandler(req, res) {
  try {
    const { token, amountInCents, currency = 'ZAR', description = 'SHOCKWAVE Order' } = req.body || {};

    if (!token || !amountInCents) {
      return res.status(400).json({ error: 'Missing token or amount' });
    }

    // TODO: Update this to the official Yoco charge endpoint you use.
    // This is a placeholder structure—replace URL and payload per Yoco docs.
    const chargeResp = await fetch('https://online.yoco.com/v1/charges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auth-Secret-Key': YOCO_SECRET_KEY,
      },
      body: JSON.stringify({
        token,
        amountInCents,
        currency,
        description,
      }),
    });

    const chargeJson = await chargeResp.json();

    if (!chargeResp.ok || chargeJson.errorCode) {
      return res.status(400).json({ error: chargeJson.errorMessage || 'Yoco charge failed' });
    }

    // Respond with the payment/charge id so the frontend can confirm and save order.
    return res.status(200).json({
      success: true,
      chargeId: chargeJson.id,
      status: chargeJson.status,
    });
  } catch (err) {
    console.error('Yoco charge error', err);
    return res.status(500).json({ error: 'Server error creating charge' });
  }
}
