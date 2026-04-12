module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

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
  const accessToken = tokenData.access_token;

  const orderRes = await fetch("https://api-m.paypal.com", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
  intent: "CAPTURE",
  purchase_units: [{
    amount: {
      currency_code: "EUR",
      value: Number(amount).toFixed(2)
    }
  }]
})
      }]
    })
  });

  const orderData = await orderRes.json();
  res.status(200).json({ id: orderData.id });
}
