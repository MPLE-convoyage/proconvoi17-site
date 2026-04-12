module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { orderID, invoiceNumber } = req.body || {};

    if (!orderID) {
      return res.status(400).json({ error: "orderID manquant" });
    }

    const clientId = process.env.PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: "Clés PayPal manquantes dans Vercel" });
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const tokenRes = await fetch("https://api-m.paypal.com/v1/oauth2/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(tokenRes.status).json({
        error: tokenData.error_description || tokenData.error || "Erreur token PayPal",
        details: tokenData
      });
    }

    const accessToken = tokenData.access_token;

    const captureRes = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${orderID}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      }
    });

    const captureData = await captureRes.json();

    if (!captureRes.ok) {
      return res.status(captureRes.status).json({
        error: captureData.message || captureData.name || "Erreur capture PayPal",
        details: captureData
      });
    }

    return res.status(200).json({
      ok: true,
      invoiceNumber,
      orderID,
      capture: captureData
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur serveur capture-order"
    });
  }
};
