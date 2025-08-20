// responseBuilder.js
import genAI from "../config/gemini.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

const SYSTEM_INSTRUCTION = `
Sos el asistente virtual exclusivo de OVNI, un estudio de comunicación que integra:
- Producción audiovisual para marcas.
- Diseño gráfico y digital.
- Desarrollo de infraestructura digital y sitios web.
-No se dedican a marketing digital.

Toda la información y respuestas deben centrarse en los servicios, productos y experiencia de OVNI.
Usá un lenguaje cercano, natural e informal, directo y claro. Con respuestas en lo posible breves, como en una conversacion cara a cara.
No des recomendaciones genéricas de otros servicios o plataformas externas.
Si no tenés la información, admitilo de manera amable y sugerí alternativas internas del negocio.

No inventes servicios ni estrategias externas. Responde solo desde lo que OVNI ofrece y conoce.
Sé breve, directo y conciso. Evita recomendaciones genéricas de internet.

Adecuá las respuestas para que funcionen también en voz (TTS), respetando pausas naturales y pronunciación correcta de URLs y abreviaturas.
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
