const PDFDocument = require("pdfkit");

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

    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on("data", (chunk) => buffers.push(chunk));

    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);
        const pdfBase64 = pdfBuffer.toString("base64");

        const htmlDevis = `
          <div style="font-family: Arial, sans-serif; color: #142033; line-height: 1.6;">
            <h2 style="color: #0b1f3a;">Devis Proconvoi17</h2>
            <p><strong>Numéro :</strong> ${numeroFacture}</p>
            <p><strong>Client :</strong> ${nom}</p>
            <p><strong>Email :</strong> ${email}</p>
            <p><strong>Montant estimatif :</strong> ${montant} €</p>
            <p>Veuillez trouver votre devis en pièce jointe.</p>
          </div>
        `;

        const headers = {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        };

        const commonPayload = {
          from: `Proconvoi17 <${fromEmail}>`,
          subject: `Devis Proconvoi17 - ${numeroFacture}`,
          html: htmlDevis,
          attachments: [
            {
              filename: `devis-${numeroFacture}.pdf`,
              content: pdfBase64
            }
          ]
        };

        const adminRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...commonPayload,
            to: [notifyTo]
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
            ...commonPayload,
            to: [email]
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
          error: error.message || "Erreur envoi email PDF"
        });
      }
    });

    // PDF
    doc.fontSize(22).fillColor("#0b1f3a").text("DEVIS PROCONVOI17", {
      align: "center"
    });

    doc.moveDown();
    doc.fontSize(12).fillColor("#000000");
    doc.text(`Numéro : ${numeroFacture}`);
    doc.text(`Date souhaitée : ${dateSouhaitee || "-"}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#0b1f3a").text("Informations client");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#000000");
    doc.text(`Nom : ${nom}`);
    doc.text(`Email : ${email}`);
    doc.text(`Téléphone : ${telephone || "-"}`);
    doc.text(`Société : ${societe || "-"}`);
    doc.moveDown();

    doc.fontSize(14).fillColor("#0b1f3a").text("Détails de la prestation");
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor("#000000");
    doc.text(`Prestation : ${prestation || "-"}`);
    doc.text(`Véhicule : ${vehicule || "-"}`);
    doc.text(`Distance : ${distance || "-"}`);
    doc.text(`Jours : ${jours || "-"}`);
    doc.text(`Découchés : ${decouches || "-"}`);
    doc.text(`Informations complémentaires : ${infos || "-"}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor("#cccccc").stroke();
    doc.moveDown();

    doc.fontSize(18).fillColor("#0b1f3a").text(`Montant estimatif : ${montant} €`, {
      align: "right"
    });

    doc.moveDown(2);
    doc.fontSize(10).fillColor("#666666").text(
      "Proconvoi17 - Merci pour votre demande.",
      { align: "center" }
    );

    doc.end();
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur serveur devis PDF"
    });
  }
};
