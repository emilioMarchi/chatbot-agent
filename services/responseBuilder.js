import genAI from "../config/gemini.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

// La instrucción del sistema ahora es más simple y se enfoca en la personalidad del bot.
const SYSTEM_INSTRUCTION = `Sos el asistente virtual de la Asociación Cultural El Puente, un centro cultural independiente y autogestionado.
Tu tono es cercano, claro, natural e informal, como si hablaras cara a cara con alguien que cayó al lugar a preguntar algo.
Deducís por contexto qué necesita la persona: puede ser info sobre talleres, eventos, horarios, contactos, ubicación u otras dudas.
No uses emoticones, ni te pongas muy formal. Si ya se saludaron, no hace falta volver a hacerlo.
Siempre que compartas un enlace, escribilo como una URL completa, sin encerrarlo entre corchetes ni usar markdown. Ejemplo: https://ejemplo.com
Respondé de forma directa, útil, empática y concreta. Sin vueltas innecesarias.`;

async function generateResponse(mensaje, historial = []) {
  try {
    // 1. Recuperar contexto relevante usando la búsqueda por vectores (RAG)
    const relevantContext = await searchKnowledgeBase(mensaje, 3);

    // 2. Preparar el historial para Gemini
    const geminiHistory = historial.map((item) => ({
      role: item.role === 'bot' ? 'model' : 'user',
      parts: [{ text: item.content }]
    }));

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const chat = model.startChat({ history: geminiHistory });

    // 3. Construir el mensaje final con el contexto recuperado y la pregunta del usuario
    const messageWithContext = `
Usa el siguiente contexto para responder la pregunta del usuario. Si la respuesta no se encuentra en el contexto, decí amablemente que no tenés esa información.

Contexto:
"""
${relevantContext}
"""

Pregunta del usuario: "${mensaje}"
`;

    const result = await chat.sendMessage(messageWithContext);
    const respuesta = result.response.text().trim();

    return respuesta || "Mmm... me perdí un poco. ¿Podés repetir eso?";




  } catch (error) {
    console.error("Error generando respuesta con Gemini:", error);
    return "Estoy medio trabado para responderte ahora. ¿Podés decirme eso de nuevo o con otras palabras?";
  }
}

export { generateResponse };

