import express from "express";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

const META_TOKEN = process.env.META_TOKEN;
const PHONE_NUMBER_ID = process.env.META_PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

// ----------------------
// GET /webhook → Verificación inicial
// ----------------------
router.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado por Meta");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ----------------------
// POST /webhook → Recibir mensajes
// ----------------------
router.post("/webhook", async (req, res) => {
  res.sendStatus(200); // respondemos rápido a Meta

  try {
    const entry = req.body.entry?.[0]?.changes?.[0]?.value;
    if (!entry?.messages) return;

    const message = entry.messages[0];
    const from = message.from; // número del usuario
    const text = message.text?.body;

    console.log(`📩 Mensaje de ${from}: ${text}`);

    // Llamamos a tu endpoint de chatbot
    const { data } = await axios.post(`http://localhost:3000/chatbot`, {
      userId: from,
      message: text
    });

    const reply = data.reply;

    // Enviar respuesta por la API de Meta
    await axios.post(
      `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        text: { body: reply }
      },
      {
        headers: {
          Authorization: `Bearer ${META_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log(`📤 Respuesta enviada a ${from}: ${reply}`);

  } catch (err) {
    console.error("❌ Error en el webhook de WhatsApp:", err.response?.data || err.message);
  }
});

export default router;
