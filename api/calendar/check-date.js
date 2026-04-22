module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { date } = req.query || {};

    if (!date) {
      return res.status(400).json({ error: "Date manquante" });
    }

    const icsUrl = process.env.GOOGLE_CALENDAR_ICS_URL;

    if (!icsUrl) {
      return res.status(500).json({ error: "GOOGLE_CALENDAR_ICS_URL manquant dans Vercel" });
    }

    const response = await fetch(icsUrl);
    const icsText = await response.text();

    if (!response.ok || !icsText) {
      return res.status(500).json({ error: "Impossible de lire le calendrier Google" });
    }

    const lines = icsText.replace(/\r\n/g, "\n").split("\n");

    const events = [];
    let currentEvent = null;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (line === "BEGIN:VEVENT") {
        currentEvent = {};
        continue;
      }

      if (line === "END:VEVENT") {
        if (currentEvent) events.push(currentEvent);
        currentEvent = null;
        continue;
      }

      if (!currentEvent) continue;

      if (line.startsWith("DTSTART")) {
        const parts = line.split(":");
        currentEvent.dtstart = parts.slice(1).join(":");
      }

      if (line.startsWith("DTEND")) {
        const parts = line.split(":");
        currentEvent.dtend = parts.slice(1).join(":");
      }
    }

    function normalizeIcsDate(value) {
      if (!value) return null;

      if (/^\d{8}$/.test(value)) {
        return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
      }

      if (/^\d{8}T/.test(value)) {
        return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
      }

      return null;
    }

    function dateToNumber(str) {
      return Number(str.replace(/-/g, ""));
    }

    const target = dateToNumber(date);
    let unavailable = false;

    for (const event of events) {
      const start = normalizeIcsDate(event.dtstart);
      const end = normalizeIcsDate(event.dtend);

      if (!start) continue;

      const startNum = dateToNumber(start);

      if (end) {
        const endNum = dateToNumber(end);
        if (target >= startNum && target < endNum) {
          unavailable = true;
          break;
        }
      } else {
        if (target === startNum) {
          unavailable = true;
          break;
        }
      }
    }

    return res.status(200).json({
      date,
      unavailable
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Erreur calendrier"
    });
  }
};
