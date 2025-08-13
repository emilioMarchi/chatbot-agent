import express from "express";
import { generateResponse } from "../services/responseBuilder.js";
import { getHistory, saveHistory } from "../services/cacheManager.js";

const router = express.Router();

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

    const historialPrevio = await getHistory(userId)
    // Construimos el historial para el turno actual, incluyendo el mensaje del usuario
    const historialActual = [...historialPrevio, { role: 'user', content: message }];

    // Generamos la respuesta usando el historial actualizado para que el modelo tenga contexto
    const respuesta = await generateResponse(message, historialActual);

    // Construimos el historial final y lo guardamos en la base de datos en una sola operación
    const historialFinal = [...historialActual, { role: 'bot', content: respuesta }];
    await saveHistory(userId, historialFinal);


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

