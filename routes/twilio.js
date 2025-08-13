import express from "express";
import { generateResponse } from "../services/responseBuilder.js";

import fs from 'fs';
import twilio from 'twilio';

const MessagingResponse = twilio.twiml.MessagingResponse;


const rawData = fs.readFileSync('./data.json');
const data = JSON.parse(rawData);

const router = express.Router();

// Cache simple por número de WhatsApp
const memoryCache = {};

router.post("/", async (req, res) => {
  const from = req.body.From; // ejemplo: whatsapp:+549XXXXXXXXXX
  const message = req.body.Body;
  if (!from || !message) {
    return res.status(400).send("Faltan datos en el mensaje");
  }

  // Inicializar historial por número
  if (!memoryCache[from]) {
    memoryCache[from] = [];
  }

  try {
    const historialPrevio = memoryCache[from].slice();
    memoryCache[from].push({ role: "user", content: message });

    const responseText = await generateResponse(message, data, historialPrevio);

    memoryCache[from].push({ role: "bot", content: responseText });

    if (memoryCache[from].length > 20) {
      memoryCache[from] = memoryCache[from].slice(-20);
    }

    // Responder a Twilio en formato TwiML (XML)
    const twiml = new MessagingResponse();
    twiml.message(responseText);

    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error("Error al responder por WhatsApp:", error);

    const fallback = "Estoy medio trabado para responderte ahora. ¿Podés decirme eso de nuevo?";
    const twiml = new MessagingResponse();
    twiml.message(fallback);

    res.type('text/xml');
    res.send(twiml.toString());
  }
});

export default router;
