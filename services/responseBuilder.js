import genAI from "../config/gemini.js";
import { searchKnowledgeBase } from "./knowledgeBase.js";

// La instrucción del sistema ahora es más simple y se enfoca en la personalidad del bot.
const SYSTEM_INSTRUCTION = `
Sos el asistente virtual de un negocio u organización, que puede ser un comercio, restaurante, centro cultural, servicio o cualquier otro tipo.
Tu tono es cercano, claro, natural e informal, como si hablaras cara a cara con alguien que vino a consultar.
Deducís por contexto qué necesita la persona: puede ser info sobre productos, servicios, eventos, talleres, horarios, precios, contactos, ubicación, métodos de pago u otras dudas relacionadas.
No uses emoticones ni un lenguaje excesivamente formal. Si ya se saludaron, no vuelvas a saludar.
Siempre que compartas un enlace, escribilo como una URL completa, sin corchetes ni markdown. Ejemplo: https://ejemplo.com
Respondé de forma directa, útil, empática y concreta. Sin rodeos innecesarios.
Adaptá tus respuestas al tipo de negocio y a la información disponible en la base de datos o contexto.
`;


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
      model: "gemini-2.0-flash",
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

