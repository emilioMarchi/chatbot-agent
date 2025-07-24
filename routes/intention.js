import express from "express";
import { detectIntention } from "../services/intentDetector.js";
import { generateResponse } from "../services/responseBuilder.js";

import fs from 'fs';
const rawData = fs.readFileSync('./data.json'); // o '../data.json' según tu estructura
const data = JSON.parse(rawData);

const router = express.Router();

// Memoria en caché simple (por IP)
const memoryCache = {};

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Falta el mensaje a analizar" });
  }

  const userId = req.ip; // Podés cambiar a otro ID si tenés login
  if (!memoryCache[userId]) {
    memoryCache[userId] = [];
  }

  try {
    const historialPrevio = memoryCache[userId].slice(); // copiamos el historial actual
    memoryCache[userId].push({ role: "user", content: message });

    const response = await generateResponse(message, data, historialPrevio);

    memoryCache[userId].push({ role: "bot", content: response });

    if (memoryCache[userId].length > 20) {
      memoryCache[userId] = memoryCache[userId].slice(-20);
    }

    res.json({ response });

  } catch (error) {
    console.error("Error total en el chatbot:", error);

    // Fallback: respuesta por si todo falla
    const fallback = "Uff, se me mezclaron las ideas. ¿Probás de nuevo en un ratito?";
    
    // También agregamos esa respuesta al historial para mantener la conversación coherente
    memoryCache[userId].push({ role: "bot", content: fallback });

    res.json({ response: fallback });
  }
});

export default router;