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

    function drawHeader(doc, title) {
      if (hasLogo) {
        try {
          doc.image(logoPath, 50, 40, { width: 80 });
        } catch (_) {}
      }

      doc
        .fillColor("#0b1f3a")
        .fontSize(24)
        .text("PROCONVOI17", hasLogo ? 145 : 50, 48, { align: "left" });

      doc
        .fontSize(11)
        .fillColor("#52627b")
        .text("Convoyage VL / PL / SPL - Conducteur PL / SPL indépendant", hasLogo ? 145 : 50, 78);

      doc
        .moveTo(50, 120)
        .lineTo(545, 120)
        .strokeColor("#d9dee7")
        .stroke();

      doc
        .moveDown(3)
        .fontSize(20)
        .fillColor("#0b1f3a")
        .text(title, 50, 140, { align: "center" });

      doc.moveDown(2);
    }

    function drawSectionTitle(doc, text) {
      doc
        .moveDown(0.8)
        .fontSize(13)
        .fillColor("#0b1f3a")
        .text(text);

      doc
        .moveTo(50, doc.y + 4)
        .lineTo(545, doc.y + 4)
        .strokeColor("#e5e7eb")
        .stroke();

      doc.moveDown(0.8);
    }

    function drawField(doc, label, value) {
      doc
        .fontSize(10)
        .fillColor("#5b6472")
        .text(label);

      doc
        .fontSize(12)
        .fillColor("#142033")
        .text(value || "-");

      doc.moveDown(0.4);
    }

    function drawTotalBox(doc, total) {
      const y = doc.y + 10;

      doc
        .roundedRect(330, y, 215, 52, 10)
        .fillAndStroke("#f8fafc", "#d9dee7");

      doc
        .fillColor("#5b6472")
        .fontSize(10)
        .text("Montant estimatif", 345, y + 10);

      doc
        .fillColor("#0b1f3a")
        .fontSize(18)
        .text(`${total} €`, 345, y + 24);

      doc.moveDown(4);
    }

    function footer(doc, reference) {
      doc
        .fontSize(9)
        .fillColor("#7b8494")
        .text(`Référence : ${reference}`, 50, 760, { align: "center", width: 495 });
    }

    function generateDevisPDF() {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50, size: "A4" });
          const buffers = [];

          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          drawHeader(doc, "DEVIS");

          drawSectionTitle(doc, "Informations client");
          drawField(doc, "Nom", nom);
          drawField(doc, "Email", email);
          drawField(doc, "Téléphone", telephone);
          drawField(doc, "Société", societe);

          drawSectionTitle(doc, "Détails de la prestation");

          if (isConducteur) {
            drawField(doc, "Prestation", "Conducteur PL / SPL");
            drawField(doc, "Tarif journalier", "320 € / jour");
            drawField(doc, "Amplitude journalière", "12h");
            drawField(doc, "Découché", "90 €");
            drawField(doc, "Nombre de jours", jours);
            drawField(doc, "Nombre de découchés", decouches);
          } else {
            drawField(doc, "Prestation", prestation);
            drawField(doc, "Type de véhicule", vehicule);
            drawField(doc, "Distance", distance);
          }

          drawField(doc, "Date souhaitée", dateSouhaitee);
          drawField(doc, "Informations complémentaires", infos);

          drawTotalBox(doc, montant);

          doc.moveDown(1.5);
          doc
            .fontSize(10)
            .fillColor("#5b6472")
            .text("Ce devis est fourni à titre estimatif selon les informations communiquées.", {
              align: "left"
            });

          footer(doc, numeroFacture);
          doc.end();
        } catch (error) {
          reject(error);
        }
      });
    }

    function generateContratPDF() {
      return new Promise((resolve, reject) => {
        try {
          const doc = new PDFDocument({ margin: 50, size: "A4" });
          const buffers = [];

          doc.on("data", (chunk) => buffers.push(chunk));
          doc.on("end", () => resolve(Buffer.concat(buffers)));
          doc.on("error", reject);

          drawHeader(doc, "CONTRAT DE PRESTATION");

          drawSectionTitle(doc, "Parties");
          drawField(doc, "Prestataire", "Proconvoi17");
          drawField(doc, "Client", nom);
          drawField(doc, "Email client", email);
          drawField(doc, "Téléphone client", telephone);
          drawField(doc, "Société", societe);

          drawSectionTitle(doc, "Objet du contrat");

          if (isConducteur) {
            drawField(doc, "Prestation demandée", "Conducteur PL / SPL");
            drawField(doc, "Tarif journalier", "320 € / jour");
            drawField(doc, "Amplitude journalière", "12h");
            drawField(doc, "Découché", "90 €");
            drawField(doc, "Nombre de jours", jours);
            drawField(doc, "Nombre de découchés", decouches);
          } else {
            drawField(doc, "Prestation demandée", prestation);
            drawField(doc, "Véhicule", vehicule);
            drawField(doc, "Distance", distance);
          }

          drawField(doc, "Date prévue", dateSouhaitee);

          drawSectionTitle(doc, "Conditions financières");
          drawField(doc, "Montant estimatif", `${montant} €`);
          drawField(doc, "Référence", numeroFacture);

          drawSectionTitle(doc, "Conditions");
          doc
            .fontSize(11)
            .fillColor("#142033")
            .text("Le client reconnaît avoir pris connaissance de la prestation proposée et des conditions tarifaires.")
            .moveDown(0.5)
            .text("Le paiement valide l’acceptation de la mission selon les éléments indiqués dans le devis.")
            .moveDown(0.5)
            .text("Toute annulation tardive peut entraîner des frais selon l’avancement de la mission.")
            .moveDown(0.5)
            .text("Les données communiquées sont utilisées uniquement pour le traitement de la demande.")
            .moveDown(1);

          if (infos) {
            drawSectionTitle(doc, "Informations complémentaires");
            doc.fontSize(11).fillColor("#142033").text(infos);
            doc.moveDown(1);
          }

          drawSectionTitle(doc, "Signatures");
          doc
            .fontSize(11)
            .fillColor("#142033")
            .text("Signature client :", 50, doc.y + 10)
            .moveTo(160, doc.y + 15)
            .lineTo(320, doc.y + 15)
            .strokeColor("#999999")
            .stroke();

          doc
            .fontSize(11)
            .fillColor("#142033")
            .text("Signature Proconvoi17 :", 50, doc.y + 50)
            .moveTo(200, doc.y + 55)
            .lineTo(380, doc.y + 55)
            .strokeColor("#999999")
            .stroke();

          footer(doc, numeroFacture);
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
