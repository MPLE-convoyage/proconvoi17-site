const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

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

    const logoPath = path.join(process.cwd(), "logo-proconvoi17.png");
    const hasLogo = fs.existsSync(logoPath);
    const isConducteur = prestation === "conducteur" || prestation === "Conducteur PL / SPL";

    const ENTREPRISE_NOM = "Proconvoi17";
    const ENTREPRISE_CONTACT = "PLE Mickael";
    const ENTREPRISE_TEL = "07 63 08 26 37";
    const ENTREPRISE_EMAIL = "contact@proconvoi17.fr";
    const ENTREPRISE_ADRESSE = "Saintes";
    const ENTREPRISE_SIRET = "532 293 461 00044";

    function safe(v) {
      return v && String(v).trim() ? String(v) : "-";
    }

    function drawPageHeader(doc, title) {
      doc.rect(0, 0, 595, 95).fill("#0b1f3a");

      if (hasLogo) {
        try {
          doc.image(logoPath, 42, 18, { width: 58 });
        } catch (_) {}
      }

      doc
        .fillColor("#ffffff")
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("PROCONVOI17", hasLogo ? 115 : 42, 24);

      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#d8e2f0")
        .text("Convoyage VL / PL / SPL - Conducteur PL / SPL indépendant", hasLogo ? 115 : 42, 54);

      doc
        .fillColor("#0b1f3a")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text(title, 50, 120, { align: "center", width: 495 });

      doc.moveDown();
    }

    function drawInfoBox(doc, x, y, w, h, title, lines) {
      doc
        .roundedRect(x, y, w, h, 10)
        .fillAndStroke("#f8fafc", "#d9dee7");

      doc
        .fillColor("#0b1f3a")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(title, x + 12, y + 10);

      let currentY = y + 30;
      lines.forEach((line) => {
        doc
          .fillColor("#142033")
          .fontSize(10)
          .font("Helvetica")
          .text(line, x + 12, currentY, { width: w - 24 });
        currentY += 15;
      });
    }

    function drawSectionTitle(doc, title, y = null) {
      if (y !== null) doc.y = y;

      doc.moveDown(0.8);
      doc
        .fillColor("#0b1f3a")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text(title);

      doc
        .moveTo(50, doc.y + 4)
        .lineTo(545, doc.y + 4)
        .strokeColor("#d9dee7")
        .stroke();

      doc.moveDown(0.8);
    }

    function drawFieldRow(doc, label, value) {
      const y = doc.y;

      doc
        .fillColor("#5b6472")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text(label, 55, y, { width: 150 });

      doc
        .fillColor("#142033")
        .fontSize(11)
        .font("Helvetica")
        .text(safe(value), 190, y, { width: 330 });

      doc.moveDown(0.9);
    }

    function drawTotal(doc, total) {
      const y = doc.y + 8;

      doc
        .roundedRect(320, y, 225, 62, 12)
        .fillAndStroke("#eef4ff", "#b9c9e6");

      doc
        .fillColor("#5b6472")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("MONTANT ESTIMATIF", 336, y + 12);

      doc
        .fillColor("#0b1f3a")
        .fontSize(22)
        .font("Helvetica-Bold")
        .text(`${safe(total)} €`, 336, y + 28);

      doc.moveDown(4.2);
    }

    function drawEntrepriseFooter(doc, reference) {
      doc
        .strokeColor("#d9dee7")
        .moveTo(50, 728)
        .lineTo(545, 728)
        .stroke();

      doc
        .fillColor("#5b6472")
        .fontSize(8.5)
        .font("Helvetica")
        .text(
          `${ENTREPRISE_NOM} - ${ENTREPRISE_CONTACT} - ${ENTREPRISE_TEL} - ${ENTREPRISE_EMAIL}`,
          50,
          738,
          { width: 495, align: "center" }
        );

      doc
        .text(
          `${ENTREPRISE_ADRESSE} - SIRET : ${ENTREPRISE_SIRET}`,
          50,
          750,
          { width: 495, align: "center" }
        );

      doc
        .text(`Référence : ${reference}`, 50, 762, { width: 495, align: "center" });
    }

    function generateDevisPDF() {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margin: 40 });
          const buffers = [];

          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          drawPageHeader(doc, "DEVIS");

          drawInfoBox(doc, 50, 165, 230, 95, "CLIENT", [
            `Nom : ${safe(nom)}`,
            `Email : ${safe(email)}`,
            `Téléphone : ${safe(telephone)}`,
            `Société : ${safe(societe)}`
          ]);

          drawInfoBox(doc, 315, 165, 230, 95, "RÉFÉRENCE", [
            `Numéro : ${safe(numeroFacture)}`,
            `Date souhaitée : ${safe(dateSouhaitee)}`,
            `Statut : En attente`,
            `Entreprise : ${ENTREPRISE_NOM}`
          ]);

          doc.y = 285;
          drawSectionTitle(doc, "Détails de la prestation", 285);

          if (isConducteur) {
            drawFieldRow(doc, "Prestation", "Conducteur PL / SPL");
            drawFieldRow(doc, "Tarif journalier", "320 € / jour");
            drawFieldRow(doc, "Amplitude journalière", "12h");
            drawFieldRow(doc, "Découché", "90 €");
            drawFieldRow(doc, "Nombre de jours", jours);
            drawFieldRow(doc, "Nombre de découchés", decouches);
          } else {
            drawFieldRow(doc, "Prestation", prestation === "convoyage" ? "Convoyage" : prestation);
            drawFieldRow(doc, "Type de véhicule", vehicule === "vl" ? "VL - 0,98 €/km" : vehicule === "pl" ? "PL / SPL - 2,20 €/km" : vehicule);
            drawFieldRow(doc, "Distance", distance ? `${distance} km` : "-");
          }

          drawFieldRow(doc, "Date souhaitée", dateSouhaitee);
          drawFieldRow(doc, "Informations complémentaires", infos);

          drawTotal(doc, montant);

          drawSectionTitle(doc, "Conditions de paiement");
          doc
            .fillColor("#142033")
            .fontSize(11)
            .font("Helvetica")
            .text("Le paiement peut s’effectuer via PayPal ou tout autre moyen convenu entre les parties.", { width: 495 })
            .moveDown(0.4)
            .text("La prestation peut être confirmée après règlement ou acompte selon l’accord convenu.", { width: 495 })
            .moveDown(0.4)
            .text("Toute mission commencée ou réservée peut entraîner des frais en cas d’annulation tardive.", { width: 495 });

          drawEntrepriseFooter(doc, numeroFacture);
          doc.end();
        } catch (error) {
          reject(error);
        }
      });
    }

    function generateContratPDF() {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margin: 40 });
          const buffers = [];

          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          drawPageHeader(doc, "CONTRAT DE PRESTATION");

          drawInfoBox(doc, 50, 165, 230, 95, "PRESTATAIRE", [
            ENTREPRISE_NOM,
            ENTREPRISE_CONTACT,
            ENTREPRISE_TEL,
            `Référence : ${safe(numeroFacture)}`
          ]);

          drawInfoBox(doc, 315, 165, 230, 95, "CLIENT", [
            `Nom : ${safe(nom)}`,
            `Email : ${safe(email)}`,
            `Téléphone : ${safe(telephone)}`,
            `Société : ${safe(societe)}`
          ]);

          doc.y = 285;
          drawSectionTitle(doc, "Objet du contrat", 285);

          if (isConducteur) {
            drawFieldRow(doc, "Prestation demandée", "Conducteur PL / SPL");
            drawFieldRow(doc, "Tarif journalier", "320 € / jour");
            drawFieldRow(doc, "Amplitude journalière", "12h");
            drawFieldRow(doc, "Découché", "90 €");
            drawFieldRow(doc, "Nombre de jours", jours);
            drawFieldRow(doc, "Nombre de découchés", decouches);
          } else {
            drawFieldRow(doc, "Prestation demandée", prestation === "convoyage" ? "Convoyage" : prestation);
            drawFieldRow(doc, "Type de véhicule", vehicule === "vl" ? "VL - 0,98 €/km" : vehicule === "pl" ? "PL / SPL - 2,20 €/km" : vehicule);
            drawFieldRow(doc, "Distance prévue", distance ? `${distance} km` : "-");
          }

          drawFieldRow(doc, "Date prévue", dateSouhaitee);
          drawFieldRow(doc, "Montant estimatif", `${safe(montant)} €`);

          drawSectionTitle(doc, "Conditions générales");
          doc
            .fillColor("#142033")
            .fontSize(11)
            .font("Helvetica")
            .text("Le client reconnaît avoir pris connaissance de la prestation proposée et des conditions tarifaires.", { width: 495 })
            .moveDown(0.5)
            .text("Le paiement valide l’acceptation de la mission selon les éléments indiqués dans le devis.", { width: 495 })
            .moveDown(0.5)
            .text("Toute annulation tardive peut entraîner des frais selon l’avancement de la mission.", { width: 495 })
            .moveDown(0.5)
            .text("Les données communiquées sont utilisées uniquement pour le traitement de la demande.", { width: 495 });

          doc.moveDown(0.8);
          drawSectionTitle(doc, "Conditions de paiement");
          doc
            .fillColor("#142033")
            .fontSize(11)
            .font("Helvetica")
            .text("Le règlement s’effectue via PayPal ou tout autre mode de paiement convenu.", { width: 495 })
            .moveDown(0.5)
            .text("Le paiement ou l’acompte peut être exigé avant le début de la mission.", { width: 495 })
            .moveDown(0.5)
            .text("En cas de retard de paiement, la mission peut être suspendue ou reportée.", { width: 495 });

          if (infos) {
            doc.moveDown(0.8);
            drawSectionTitle(doc, "Informations complémentaires");
            doc
              .font("Helvetica")
              .fillColor("#142033")
              .fontSize(11)
              .text(infos, { width: 495 });
          }

          doc.moveDown(1);
          drawSectionTitle(doc, "Signatures");

          const baseY = doc.y + 15;

          doc
            .roundedRect(50, baseY, 220, 85, 10)
            .strokeColor("#d9dee7")
            .stroke();

          doc
            .roundedRect(325, baseY, 220, 85, 10)
            .strokeColor("#d9dee7")
            .stroke();

          doc
            .fillColor("#0b1f3a")
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("Signature client", 65, baseY + 12);

          doc
            .fillColor("#0b1f3a")
            .font("Helvetica-Bold")
            .fontSize(11)
            .text("Signature Proconvoi17", 340, baseY + 12);

          doc
            .strokeColor("#999999")
            .moveTo(65, baseY + 58)
            .lineTo(245, baseY + 58)
            .stroke();

          doc
            .strokeColor("#999999")
            .moveTo(340, baseY + 58)
            .lineTo(520, baseY + 58)
            .stroke();

          drawEntrepriseFooter(doc, numeroFacture);
          doc.end();
        } catch (error) {
          reject(error);
        }
      });
    }

    const devisBuffer = await generateDevisPDF();
    const contratBuffer = await generateContratPDF();

    const devisBase64 = devisBuffer.toString("base64");
    const contratBase64 = contratBuffer.toString("base64");

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    };

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; color: #142033; line-height: 1.6;">
        <h2 style="color: #0b1f3a;">Documents Proconvoi17</h2>
        <p><strong>Référence :</strong> ${numeroFacture}</p>
        <p><strong>Client :</strong> ${nom}</p>
        <p><strong>Montant estimatif :</strong> ${montant} €</p>
        <p>Veuillez trouver en pièces jointes votre devis et le contrat de prestation.</p>
      </div>
    `;

    const commonPayload = {
      from: `Proconvoi17 <${fromEmail}>`,
      subject: `Devis et contrat - ${numeroFacture}`,
      html: htmlMessage,
      attachments: [
        {
          filename: `devis-${numeroFacture}.pdf`,
          content: devisBase64
        },
        {
          filename: `contrat-${numeroFacture}.pdf`,
          content: contratBase64
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
      error: error.message || "Erreur serveur envoi devis/contrat"
    });
  }
};
