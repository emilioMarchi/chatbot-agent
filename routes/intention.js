import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { generateResponse } from "../services/responseBuilder.js";
import { getHistory, saveHistory } from "../services/cacheManager.js";
import { textToSpeech, speechToText } from "../services/speachToText.js";

const router = express.Router();
const upload = multer(); // en memoria

// Ruta única: procesa texto o audio
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    const { userId, message } = req.body;
    let userMessage = message;

    // Si vino audio en vez de texto → transcribir
    if (req.file) {
      const audioBuffer = req.file.buffer;
      userMessage = await speechToText(audioBuffer);
    }

    if (!userId || !userMessage) {
      return res.status(400).json({ error: "Faltan userId o mensaje" });
    }

    // Historial
    const historialPrevio = await getHistory(userId);
    const historialActual = [...historialPrevio, { role: "user", content: userMessage }];

    // Generar respuesta IA
    const { respuesta, ttsText } = await generateResponse(userMessage, historialActual);

    // Guardar historial actualizado
    const historialFinal = [...historialActual, { role: "bot", content: respuesta }];
    await saveHistory(userId, historialFinal);

    // Generar TTS
    let audioBase64 = null;
    try {
      const outputPath = path.join("temp", `tts_${Date.now()}.mp3`);
      await textToSpeech(ttsText, outputPath);
      audioBase64 = fs.readFileSync(outputPath, { encoding: "base64" });
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Error generando audio TTS:", err);
    }

    res.status(200).json({
      userText: userMessage,
      reply: respuesta,
      audioBase64
    });

  } catch (err) {
    console.error("❌ Error en /chatbot:", err);
    res.status(500).json({ error: "Error procesando mensaje", details: err.message });
  }
});

export default router;
