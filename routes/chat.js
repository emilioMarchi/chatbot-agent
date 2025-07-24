import express from "express";
import genAI from "../config/gemini.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { prompt } = req.body;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // ← este es el correcto para vos
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({ text });
  } catch (error) {
    console.error("Error con Gemini API:", error);
    res.status(500).json({ error: "Error al generar contenido con Gemini" });
  }
});

export default router;
