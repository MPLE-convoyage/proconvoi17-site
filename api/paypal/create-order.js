module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { amount, invoiceNumber, customerName } = req.body || {};

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Montant invalide" });
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

    const orderRes = await fetch("https://api-m.paypal.com/v2/checkout/orders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            invoice_id: invoiceNumber || `FAC-${Date.now()}`,
            description: `Facture ${invoiceNumber || ""} - ${customerName || "Client"}`.trim(),
            amount: {
              currency_code: "EUR",
              value: Number(amount).toFixed(2)
            }
          }
        ]
      })
    });

    const orderData = await orderRes.json();

    if (!orderRes.ok) {
      return res.status(orderRes.status).json({
        error: orderData.message || orderData.name || "Erreur création commande PayPal",
        details: orderData
      });
    }

    return res.status(200).json({ id: orderData.id });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur serveur create-order"
    });
  }
};
