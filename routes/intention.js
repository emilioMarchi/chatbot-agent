import express from "express";
import { generateResponse } from "../services/responseBuilder.js";

const router = express.Router();
const memoryCache = {};

// Endpoint genérico para el chatbot que mantiene historial
router.post("/", async (req, res) => {
  try {
    // Esperamos un cuerpo con `userId` y `message`
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: "Faltan los campos 'userId' o 'message' en la petición.",
      });
    }

    // Historial por usuario
    if (!memoryCache[userId]) {
      memoryCache[userId] = [];
    }
    const historialPrevio = [...memoryCache[userId]];

    memoryCache[userId].push({ role: "user", content: message });

    const respuesta = await generateResponse(message, historialPrevio);

    memoryCache[userId].push({ role: "bot", content: respuesta });

    // Mantener últimas 20 interacciones
    if (memoryCache[userId].length > 20) {
      memoryCache[userId] = memoryCache[userId].slice(-20);
    }

    // Devolvemos la respuesta directamente en el cuerpo de la petición
    res.status(200).json({ reply: respuesta });
  } catch (error) {
    console.error("❌ Error al procesar el mensaje del chatbot:", error);
    res.status(500).json({
      error: "Hubo un problema al generar la respuesta.",
      details: error.message,
    });
  }
});

export default router;

