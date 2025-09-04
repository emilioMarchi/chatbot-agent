// routes/voiceSession.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { generateResponse } from "../services/responseBuilder.js";
import { getHistory, saveHistory } from "../services/cacheManager.js";
import { textToSpeechGoogle, speechToText } from "../services/speachToText.js";

const router = express.Router();
const upload = multer(); // en memoria

// Asegurarse de que la carpeta temp exista
const tempDir = path.join("temp");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

// Ruta para conversación de voz continua
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    const { userId } = req.body;
    console.log("POST /voice-session recibido. userId:", userId);

    if (!userId) return res.status(400).json({ error: "Falta userId" });
    if (!req.file) return res.status(400).json({ error: "Falta audio" });

    // 1️⃣ Transcribir audio del usuario
    const userAudioBuffer = req.file.buffer;
    const userMessage = await speechToText(userAudioBuffer);

    if (!userMessage) {
      return res.status(200).json({ userText: "", reply: "", audioBase64: null });
    }

    // 2️⃣ Historial
    const historialPrevio = await getHistory(userId);
    const historialActual = [...historialPrevio, { role: "user", content: userMessage }];

    // 3️⃣ Generar respuesta IA
    const { respuesta, ttsText } = await generateResponse(userMessage, historialActual);

    // 4️⃣ Guardar historial actualizado
    const historialFinal = [...historialActual, { role: "bot", content: respuesta }];
    await saveHistory(userId, historialFinal);

    // 5️⃣ Generar audio TTS
    let audioBase64 = null;
    try {
      const outputPath = path.join(tempDir, `tts_${Date.now()}.mp3`);
      await textToSpeechGoogle(ttsText, outputPath);
      audioBase64 = fs.readFileSync(outputPath, { encoding: "base64" });
      fs.unlinkSync(outputPath);
    } catch (err) {
      console.error("Error generando audio TTS:", err);
    }
    console.log(userMessage, respuesta)
    res.status(200).json({
      userText: userMessage,
      reply: respuesta,
      audioBase64
    }); 

  } catch (err) {
    console.error("❌ Error en /voice-session:", err);
    res.status(500).json({ error: "Error procesando audio", details: err.message });
  }
});

export default router;
