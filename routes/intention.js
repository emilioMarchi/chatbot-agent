import express from "express";

import { generateResponse } from "../services/responseBuilder.js";

import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const rawData = fs.readFileSync('./data.json'); // o '../data.json' según tu estructura
const data = JSON.parse(rawData);

const router = express.Router();

// Memoria en caché simple (por userId)
const memoryCache = {};

router.post("/", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Falta el mensaje a analizar" });
  }

  // --- USER ID desde cookie (o generar uno nuevo) ---
  let userId = req.cookies.userId;
  if (!userId) {
    userId = uuidv4();
    res.cookie("userId", userId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    });
  }

  // Inicializar historial
  if (!memoryCache[userId]) {
    memoryCache[userId] = [];
  }

  try {
    const historialPrevio = memoryCache[userId].slice(); // copia actual del historial
    memoryCache[userId].push({ role: "user", content: message });

    const response = await generateResponse(message, data, historialPrevio);

    memoryCache[userId].push({ role: "bot", content: response });

    // Limitar historial a últimos 20 mensajes
    if (memoryCache[userId].length > 20) {
      memoryCache[userId] = memoryCache[userId].slice(-20);
    }

    res.json({ response });

  } catch (error) {
    console.error("Error total en el chatbot:", error);
    const fallback = "Uff, se me mezclaron las ideas. ¿Probás de nuevo en un ratito?";
    memoryCache[userId].push({ role: "bot", content: fallback });
    res.json({ response: fallback });
  }
});

export default router;
