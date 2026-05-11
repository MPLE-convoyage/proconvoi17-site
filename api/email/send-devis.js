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
      modeFacturation,
      vehicule,
      distance,
      jours,
      heures,
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

    function addHeader(doc, title) {
      doc.rect(0, 0, 595, 92).fill("#0b1f3a");

      if (hasLogo) {
        try {
          doc.image(logoPath, 42, 18, { width: 54 });
        } catch (_) {}
      }

      doc
        .fillColor("#ffffff")
        .font("Helvetica-Bold")
        .fontSize(24)
        .text("PROCONVOI17", hasLogo ? 112 : 42, 22);

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor("#dce6f4")
        .text(
          "Convoyage VL / PL / SPL - Conducteur PL / SPL indépendant",
          hasLogo ? 112 : 42,
          52
        );

      doc
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(19)
        .text(title, 50, 116, { width: 495, align: "center" });

      doc.y = 152;
    }

    function addFooter(doc, reference) {
      const footerTop = 748;

      doc
        .strokeColor("#d9dee7")
        .moveTo(50, footerTop)
        .lineTo(545, footerTop)
        .stroke();

      doc
        .fillColor("#6b7280")
        .font("Helvetica")
        .fontSize(8.5)
        .text(
          `${ENTREPRISE_NOM} - ${ENTREPRISE_CONTACT} - ${ENTREPRISE_TEL} - ${ENTREPRISE_EMAIL}`,
          50,
          footerTop + 8,
          { width: 495, align: "center" }
        );

      doc.text(
        `${ENTREPRISE_ADRESSE} - SIRET : ${ENTREPRISE_SIRET}`,
        50,
        footerTop + 20,
        { width: 495, align: "center" }
      );

      doc.text(
        `Référence : ${reference}`,
        50,
        footerTop + 32,
        { width: 495, align: "center" }
      );
    }

    function addInfoBox(doc, x, y, w, h, title, lines) {
      doc
        .roundedRect(x, y, w, h, 10)
        .fillAndStroke("#f8fafc", "#d9dee7");

      doc
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text(title, x + 12, y + 10);

      let currentY = y + 30;
      lines.forEach((line) => {
        doc
          .fillColor("#142033")
          .font("Helvetica")
          .fontSize(10)
          .text(line, x + 12, currentY, { width: w - 24 });
        currentY += 15;
      });
    }

    function addSectionTitle(doc, title) {
      doc
        .moveDown(0.6)
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text(title);

      doc
        .moveTo(50, doc.y + 4)
        .lineTo(545, doc.y + 4)
        .strokeColor("#d9dee7")
        .stroke();

      doc.moveDown(0.7);
    }

    function addFieldRow(doc, label, value) {
      const y = doc.y;

      doc
        .fillColor("#5b6472")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text(label, 55, y, { width: 150 });

      doc
        .fillColor("#142033")
        .font("Helvetica")
        .fontSize(11)
        .text(safe(value), 190, y, { width: 330 });

      doc.moveDown(0.9);
    }

    function addParagraph(doc, text) {
      doc
        .fillColor("#142033")
        .font("Helvetica")
        .fontSize(10.8)
        .text(text, 50, doc.y, {
          width: 495,
          align: "left",
          lineGap: 2
        });

      doc.moveDown(0.5);
    }

    function ensureSpace(doc, neededHeight) {
      if (doc.y + neededHeight > 730) {
        doc.addPage();
      }
    }

    function addTotalBox(doc, total) {
      const y = doc.y + 8;

      doc
        .roundedRect(320, y, 225, 60, 12)
        .fillAndStroke("#eef4ff", "#b9c9e6");

      doc
        .fillColor("#5b6472")
        .font("Helvetica-Bold")
        .fontSize(10)
        .text("MONTANT ESTIMATIF", 336, y + 12);

      doc
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(22)
        .text(`${safe(total)} €`, 336, y + 28);

      doc.y = y + 78;
    }

    function addSignatures(doc) {
      ensureSpace(doc, 150);

      addSectionTitle(doc, "Signatures");

      const boxY = doc.y + 8;
      const boxH = 78;

      doc
        .roundedRect(50, boxY, 220, boxH, 10)
        .strokeColor("#d9dee7")
        .stroke();

      doc
        .roundedRect(325, boxY, 220, boxH, 10)
        .strokeColor("#d9dee7")
        .stroke();

      doc
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Signature client", 65, boxY + 12);

      doc
        .fillColor("#0b1f3a")
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Signature Proconvoi17", 340, boxY + 12);

      doc
        .strokeColor("#999999")
        .moveTo(65, boxY + 54)
        .lineTo(245, boxY + 54)
        .stroke();

      doc
        .strokeColor("#999999")
        .moveTo(340, boxY + 54)
        .lineTo(520, boxY + 54)
        .stroke();

      doc.y = boxY + boxH + 18;
    }

    function generateDevisPDF() {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ size: "A4", margin: 40 });
          const buffers = [];

          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          addHeader(doc, "DEVIS");

          addInfoBox(doc, 50, 160, 230, 92, "CLIENT", [
            `Nom : ${safe(nom)}`,
            `Email : ${safe(email)}`,
            `Téléphone : ${safe(telephone)}`,
            `Société : ${safe(societe)}`
          ]);

          addInfoBox(doc, 315, 160, 230, 92, "RÉFÉRENCE", [
            `Numéro : ${safe(numeroFacture)}`,
            `Date souhaitée : ${safe(dateSouhaitee)}`,
            `Statut : En attente`,
            `Entreprise : ${ENTREPRISE_NOM}`
          ]);

          doc.y = 276;
          addSectionTitle(doc, "Détails de la prestation");

          if (isConducteur) {
            addFieldRow(doc, "Prestation", "Conducteur PL / SPL");
            if (modeFacturation === "horaire") {
              addFieldRow(doc, "Mode de facturation", "Mission courte à l'heure");
              addFieldRow(doc, "Tarif horaire", "32 € / heure (minimum 3h)");
              addFieldRow(doc, "Minimum de facturation", "100 €");
              addFieldRow(doc, "Nombre d'heures", heures);
            } else {
              addFieldRow(doc, "Mode de facturation", "Forfait journée");
              addFieldRow(doc, "Tarif journalier", "340 € / jour (max 12h)");
              addFieldRow(doc, "Nombre de jours", jours);
            }
            addFieldRow(doc, "Découché", "90 €");
            addFieldRow(doc, "Nombre de découchés", decouches);
          } else {
            addFieldRow(doc, "Prestation", prestation === "convoyage" ? "Convoyage" : prestation);
            addFieldRow(
              doc,
              "Type de véhicule",
              vehicule === "vl"
                ? "VL - 1,06 €/km"
                : vehicule === "pl"
                ? "PL / SPL - 2,40 €/km"
                : vehicule
            );
            addFieldRow(doc, "Distance", distance ? `${distance} km` : "-");
          }

          addFieldRow(doc, "Date souhaitée", dateSouhaitee);
          addFieldRow(doc, "Informations complémentaires", infos);

          addTotalBox(doc, montant);

          addSectionTitle(doc, "Conditions de paiement");

addParagraph(doc, "Le règlement peut s’effectuer par PayPal, carte bancaire ou virement bancaire.");
addParagraph(doc, "Les paiements par chèque ne sont pas acceptés.");
addParagraph(doc, "Le paiement est exigible en fin de mission, sauf accord préalable entre les parties.");
addParagraph(doc, "Un acompte peut être demandé pour certaines prestations.");
          addSectionTitle(doc, "Coordonnées bancaires");

addParagraph(doc, "Titulaire : Proconvoi17");
addParagraph(doc, "IBAN : FR76 1741 8000 0100 0119 7648 561");
          addParagraph(doc, "En cas de retard de paiement, des pénalités peuvent être appliquées conformément à la réglementation.");

          addFooter(doc, numeroFacture);
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

          addHeader(doc, "CONTRAT DE PRESTATION");

          addInfoBox(doc, 50, 160, 230, 92, "PRESTATAIRE", [
            ENTREPRISE_NOM,
            ENTREPRISE_CONTACT,
            ENTREPRISE_TEL,
            `Référence : ${safe(numeroFacture)}`
          ]);

          addInfoBox(doc, 315, 160, 230, 92, "CLIENT", [
            `Nom : ${safe(nom)}`,
            `Email : ${safe(email)}`,
            `Téléphone : ${safe(telephone)}`,
            `Société : ${safe(societe)}`
          ]);

          doc.y = 276;
          addSectionTitle(doc, "Objet du contrat");

          if (isConducteur) {
            addFieldRow(doc, "Prestation demandée", "Conducteur PL / SPL");
            if (modeFacturation === "horaire") {
              addFieldRow(doc, "Mode de facturation", "Mission courte à l'heure");
              addFieldRow(doc, "Tarif horaire", "32 € / heure (minimum 3h)");
              addFieldRow(doc, "Minimum de facturation", "100 €");
              addFieldRow(doc, "Nombre d'heures", heures);
            } else {
              addFieldRow(doc, "Mode de facturation", "Forfait journée");
              addFieldRow(doc, "Tarif journalier", "340 € / jour (12h)");
              addFieldRow(doc, "Nombre de jours", jours);
            }
            addFieldRow(doc, "Découché", "90 €");
            addFieldRow(doc, "Nombre de découchés", decouches);
          } else {
            addFieldRow(doc, "Prestation demandée", prestation === "convoyage" ? "Convoyage" : prestation);
            addFieldRow(
              doc,
              "Type de véhicule",
              vehicule === "vl"
                ? "VL - 1.06 €/km"
                : vehicule === "pl"
                ? "PL / SPL - 2,40 €/km"
                : vehicule
            );
            addFieldRow(doc, "Distance prévue", distance ? `${distance} km` : "-");
          }

          addFieldRow(doc, "Date prévue", dateSouhaitee);
          addFieldRow(doc, "Montant estimatif", `${safe(montant)} €`);

          addSectionTitle(doc, "Conditions générales");
          addParagraph(doc, "Le client reconnaît avoir pris connaissance de la prestation proposée et des conditions tarifaires.");
          addParagraph(doc, "Le paiement valide l’acceptation de la mission selon les éléments indiqués dans le devis.");
          addParagraph(doc, "Toute annulation tardive peut entraîner des frais selon l’avancement de la mission.");
          addParagraph(doc, "Les données communiquées sont utilisées uniquement pour le traitement de la demande.");

          addSectionTitle(doc, "Conditions de paiement");

addParagraph(doc, "Le règlement peut s’effectuer par PayPal, carte bancaire ou virement bancaire.");
addParagraph(doc, "Les paiements par chèque ne sont pas acceptés.");
addParagraph(doc, "Le paiement est exigible en fin de mission, sauf accord spécifique.");
addParagraph(doc, "Un acompte peut être demandé avant le début de la prestation.");
         addSectionTitle(doc, "Coordonnées bancaires");

addParagraph(doc, "Titulaire : Proconvoi17");
addParagraph(doc, "IBAN : FR76 1741 8000 0100 0119 7648 561");
          addParagraph(doc, "En cas de retard de paiement, la prestation peut être suspendue ou reportée.");

          if (infos) {
            addSectionTitle(doc, "Informations complémentaires");
            addParagraph(doc, infos);
          }

          addSignatures(doc);

          addFooter(doc, numeroFacture);
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
