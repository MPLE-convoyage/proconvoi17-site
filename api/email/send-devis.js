import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const {
      nom,
      email,
      telephone,
      prestation,
      vehicule,
      distance,
      date,
      montant,
      numeroFacture
    } = req.body;

    // 📄 HTML du PDF
    const html = `
      <h1>Devis Proconvoi17</h1>
      <p><strong>Numéro :</strong> ${numeroFacture}</p>
      <p><strong>Nom :</strong> ${nom}</p>
      <p><strong>Email :</strong> ${email}</p>
      <p><strong>Téléphone :</strong> ${telephone}</p>
      <hr/>
      <p><strong>Prestation :</strong> ${prestation}</p>
      <p><strong>Véhicule :</strong> ${vehicule}</p>
      <p><strong>Distance :</strong> ${distance} km</p>
      <p><strong>Date :</strong> ${date}</p>
      <hr/>
      <h2>Montant : ${montant} €</h2>
      <p>Merci pour votre confiance.</p>
    `;

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: [email, process.env.NOTIFY_TO_EMAIL],
      subject: `Devis ${numeroFacture}`,
      html: html,
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erreur envoi email" });
  }
}
