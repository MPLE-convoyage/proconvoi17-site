module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const {
      nom,
      email,
      telephone,
      societe,
      prestation,
      vehicule,
      distance,
      jours,
      decouches,
      dateSouhaitee,
      infos,
      montant,
      numeroFacture
    } = req.body || {};

    if (!nom || !email || !montant || !numeroFacture) {
      return res.status(400).json({ error: "Données manquantes" });
    }

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL;
    const notifyTo = process.env.NOTIFY_TO_EMAIL;

    if (!apiKey || !fromEmail || !notifyTo) {
      return res.status(500).json({
        error: "Variables email manquantes dans Vercel"
      });
    }

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    const htmlDevis = `
      <div style="font-family: Arial, sans-serif; color: #142033; line-height: 1.6;">
        <h2 style="color: #0b1f3a;">Devis Proconvoi17</h2>

        <p><strong>Numéro :</strong> ${numeroFacture}</p>
        <p><strong>Client :</strong> ${nom}</p>
        <p><strong>Email :</strong> ${email}</p>
        <p><strong>Téléphone :</strong> ${telephone || "-"}</p>
        <p><strong>Société :</strong> ${societe || "-"}</p>
        <p><strong>Prestation :</strong> ${prestation || "-"}</p>
        <p><strong>Véhicule :</strong> ${vehicule || "-"}</p>
        <p><strong>Distance :</strong> ${distance || "-"}</p>
        <p><strong>Jours :</strong> ${jours || "-"}</p>
        <p><strong>Découchés :</strong> ${decouches || "-"}</p>
        <p><strong>Date souhaitée :</strong> ${dateSouhaitee || "-"}</p>
        <p><strong>Informations complémentaires :</strong> ${infos || "-"}</p>

        <hr style="margin: 20px 0;" />

        <p style="font-size: 18px;">
          <strong>Montant estimatif :</strong> ${montant} €
        </p>

        <p>Merci pour votre demande.</p>
        <p>Proconvoi17</p>
      </div>
    `;

    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: `Proconvoi17 <${fromEmail}>`,
        to: [notifyTo],
        subject: `Nouveau devis - ${numeroFacture}`,
        html: htmlDevis
      })
    });

    const adminData = await adminRes.json();

    if (!adminRes.ok) {
      return res.status(adminRes.status).json({
        error: adminData.message || adminData.name || "Erreur email admin",
        details: adminData
      });
    }

    const clientRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers,
      body: JSON.stringify({
        from: `Proconvoi17 <${fromEmail}>`,
        to: [email],
        subject: `Votre devis Proconvoi17 - ${numeroFacture}`,
        html: htmlDevis
      })
    });

    const clientData = await clientRes.json();

    if (!clientRes.ok) {
      return res.status(clientRes.status).json({
        error: clientData.message || clientData.name || "Erreur email client",
        details: clientData
      });
    }

    return res.status(200).json({
      ok: true,
      adminEmailId: adminData.id,
      clientEmailId: clientData.id
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur serveur email devis"
    });
  }
};
