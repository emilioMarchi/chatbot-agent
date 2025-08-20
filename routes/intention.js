import express from "express";
import { generateResponse } from "../services/responseBuilder.js";
import { getHistory, saveHistory } from "../services/cacheManager.js";
import { textToSpeech } from "../services/speachToText.js";
import path from "path";
import fs from "fs";

const router = express.Router();

// Recibe texto (ya sea escrito o transcripción de audio) y responde
router.post("/", async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ error: "Faltan los campos 'userId' o 'message'" });
    }

    // Recuperar historial previo y agregar mensaje del usuario
    const historialPrevio = await getHistory(userId);
    const historialActual = [...historialPrevio, { role: "user", content: message }];

    // Generar respuesta de IA
    const { respuesta, ttsText } = await generateResponse(message, historialActual);

    // Guardar historial actualizado
    const historialFinal = [...historialActual, { role: "bot", content: respuesta }];
    await saveHistory(userId, historialFinal);

    // Generar audio TTS
    let audioBase64 = null;
    try {
      const outputPath = path.join("temp", `tts_${Date.now()}.mp3`);
      await textToSpeech(ttsText, outputPath);
      audioBase64 = fs.readFileSync(outputPath, { encoding: "base64" });
      fs.unlinkSync(outputPath);
    } catch (ttsError) {
      console.error("Error generando audio TTS:", ttsError);
    }

    res.status(200).json({ reply: respuesta, audioBase64 });

  } catch (error) {
    console.error("❌ Error en endpoint /chatbot:", error);
    res.status(500).json({
      error: "Hubo un problema al procesar el mensaje.",
      details: error.message,
    });
  }
});

import multer from "multer";
import { speechToText } from "../services/speachToText.js";

const upload = multer(); // almacenamiento en memoria

// Convertir audio a texto
router.post("/stt", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Falta audio" });

    const audioBuffer = req.file.buffer;
    const text = await speechToText(audioBuffer);

    res.status(200).json({ text });

  } catch (err) {
    console.error("Error STT:", err);
    res.status(500).json({ error: "Error al convertir audio a texto" });
  }
});

export default router;
