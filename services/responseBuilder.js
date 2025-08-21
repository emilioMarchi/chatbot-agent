// responseBuilder.js
import genAI from "../config/gemini.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

function getFechaHoraActual() {
  const now = new Date();
  return now.toLocaleString(); // ej: "21/08/2025, 12:30:45"
}

// Antes de enviar el mensaje del usuario:
const fechaHora = getFechaHoraActual();

const SYSTEM_INSTRUCTION = `
Sos el asistente virtual de OVNI, un estudio de comunicación que hace:
- Producción audiovisual para marcas.
- Diseño gráfico y digital.
- Desarrollo de sitios web y soluciones digitales.
Tenes que recibir a cada cliente dando la bienvenida a OVNI studio.

La fecha y hora actuales son: ${fechaHora}

Hablá siempre como alguien de acá: cercano, natural y relajado. Evitá frases rebuscadas. Respondé directo, claro y breve, como si estuvieras charlando con un cliente frente a frente.

Solo hablá de lo que OVNI hace y conoce. No des recomendaciones de otras plataformas ni inventes servicios que no ofrecemos. Si no sabés algo, decilo con buena onda y sugerí alternativas internas.

Adecuá las respuestas para que suenen bien en voz (TTS): respetá pausas naturales, URLs y abreviaturas.
`;


function formatForSpeech(text) {
  if (!text) return "";

  let formatted = text
    // eliminar saltos de línea y exceso de espacios
    .replace(/\r?\n+/g, " ")
    .replace(/\s{2,}/g, " ")
    // reemplazar caracteres innecesarios pero NO puntos
    .replace(/[\*\_\[\]\(\)\`]/g, "")
    // agregar espacio después de signos de puntuación, excepto en URLs (ej: .com.ar)
    .replace(/([.,!?;:])(?=\S)/g, "$1 ")
    // reemplazar abreviaturas
    .replace(/\bhs\b/gi, "horas")
    // evitar pausar en dominios (.com, .com.ar, .org, etc.)
    .replace(/(\.\w{2,3}(\.\w{2})?)/gi, match => match.replace(/\./g, "<dot>"));

  formatted = formatted.trim();

  // si no termina con signo de puntuación, agregar un punto
  if (!/[.!?]$/.test(formatted)) {
    formatted += ".";
  }

  // opcional: revertir <dot> a punto si querés que la voz diga "punto com" en TTS
  formatted = formatted.replace(/<dot>/g, " punto ");

  return formatted;
}



async function generateResponse(mensaje, historial = []) {
  try {
    // Decidimos si necesitamos buscar en la base de conocimiento
    let relevantContext = "";
    const queryLower = mensaje.toLowerCase();
    relevantContext = await searchKnowledgeBase(mensaje, 3, 0.5);

    const geminiHistory = historial.map(item => ({
      role: item.role === "bot" ? "model" : "user",
      parts: [{ text: item.content }]
    }));
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite-001",
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.1,         // bajo valor, respuestas más seguras y directas
      maxOutputTokens: 40,     // limita la longitud de la respuesta
      topP: 0.3                 // controla diversidad de respuestas, opcional
    });
    
    
    const chat = model.startChat({ history: geminiHistory });
    
    console.log(relevantContext)
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
    return {
      respuesta: "Estoy medio trabado para responderte ahora. ¿Podés repetirlo?",
      ttsText: "Estoy medio trabado para responderte ahora. Podés repetirlo."
    };
  }
}

export { generateResponse };
