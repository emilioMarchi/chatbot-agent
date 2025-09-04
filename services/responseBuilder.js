// responseBuilder.js
import genAI from "../config/gemini.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

function getFechaHoraActual() {
  const now = new Date();
  return now.toLocaleString(); // ej: "21/08/2025, 12:30:45"
}

const fechaHora = getFechaHoraActual();

const SYSTEM_INSTRUCTION = `
Sos el asistente virtual de OVNI, una asistente argentina, de un estudio de comunicación que hace:
- Producción audiovisual y diseño para marcas.
- Infreaestructura digital para negocios.
Tenes que recibir a cada cliente dando la bienvenida a OVNI studio.

La fecha y hora actuales son: ${fechaHora}

Hablá siempre como alguien de acá: cercano, natural y relajado. Evitá frases rebuscadas. Respondé directo, claro y breve, como si estuvieras charlando con un cliente frente a frente.

Solo hablá de lo que OVNI hace y conoce. No des recomendaciones de otras plataformas ni inventes servicios que no ofrecemos. Si no sabés algo, decilo con buena onda y sugerí alternativas internas.

Adecuá las respuestas para que suenen bien en voz (TTS): respetá pausas naturales, URLs y abreviaturas.
`;

function formatForSpeech(text) {
  if (!text) return "";

  let formatted = text
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\*\_\[\]\(\)\`]/g, "")
    .replace(/([.,!?;:])(?=\S)/g, "$1 ")
    .replace(/\bhs\b/gi, "horas")
    .replace(/(\.\w{2,3}(\.\w{2})?)/gi, match => match.replace(/\./g, "<dot>"));

  formatted = formatted.trim();
  if (!/[.!?]$/.test(formatted)) {
    formatted += ".";
  }
  formatted = formatted.replace(/<dot>/g, " punto ");
  return formatted;
}

/**
 * Genera la respuesta del asistente
 * @param {string} mensaje - mensaje del usuario
 * @param {Array} historial - historial de la conversación
 * @param {Object} options - opcional, parámetros de control de la respuesta
 * @param {number} options.maxOutputTokens - tokens máximos (default 40)
 * @param {number} options.temperature - temperatura del modelo (default 0.1)
 * @param {number} options.topP - topP para diversidad (default 0.3)
 */
async function generateResponse(mensaje, historial = [], options = {}) {
  try {
    let relevantContext = await searchKnowledgeBase(mensaje, 3, 0.5);

    const geminiHistory = historial.map(item => ({
      role: item.role === "bot" ? "model" : "user",
      parts: [{ text: item.content }]
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite-001",
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: options.temperature ?? 0.1,
      maxOutputTokens: options.maxOutputTokens ?? 40,
      topP: options.topP ?? 0.3
    });

    const chat = model.startChat({ history: geminiHistory });

    let messageWithContext = mensaje;
    if (relevantContext) {
      messageWithContext = `
Usa el siguiente contexto para responder la pregunta del usuario. Si no se encuentra info, decí que no la tenés.
Contexto:
"""
${relevantContext}
"""
Mensaje del usuario: "${mensaje}"
`;
    }

    const result = await chat.sendMessage(messageWithContext);
    const respuesta = result.response.text().trim();

    return { respuesta, ttsText: formatForSpeech(respuesta) };

  } catch (error) {
    console.error("Error generando respuesta con Gemini:", error);
    const fallback = "Estoy medio trabado para responderte ahora. ¿Podés repetirlo?";
    return { respuesta: fallback, ttsText: formatForSpeech(fallback) };
  }
}

export { generateResponse };
