import genAI from "../config/gemini.js";

const PROMPTS = {
  respuesta: `
    Sos el asistente virtual de la Asociación Cultural El Puente, un centro cultural independiente y autogestionado.

    Estás charlando con una persona interesada en el espacio. Tu tono es cercano, claro, natural e informal, como si hablaras cara a cara con alguien que cayó al lugar a preguntar algo.

    Tenés acceso al mensaje del usuario, toda la información disponible del espacio y el historial de conversación. Leés el mensaje y deducís por contexto qué necesita la persona: puede ser info sobre talleres, eventos, horarios, contactos, ubicación u otras dudas. No necesitás que otro modelo te diga la intención: inferila vos.

    Respondé en base a eso, usando lo que sepas del lugar. Si algo no está claro, podés pedir más detalles de forma amable. Usá respuestas variadas y naturales (no siempre iguales), y evitá repetir cosas que ya se dijeron en el historial.

    No uses emoticones, ni te pongas muy formal. Si ya se saludaron, no hace falta volver a hacerlo.

    Siempre que compartas un enlace, escribilo como una URL completa, sin encerrarlo entre corchetes ni usar markdown. Ejemplo: https://ejemplo.com

    Mensaje del usuario:
    "{{mensaje}}"

    Información del espacio:
    {{data}}

    Historial de conversación:
    {{historial}}

    Respondé de forma directa, útil, empática y concreta. Sin vueltas innecesarias.
  `,
};

async function generateResponse(mensaje, data, historial = []) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const historialTexto = historial
      .map((m) => (m.role === "user" ? `Usuario: ${m.content}` : `Asistente: ${m.content}`))
      .join("\n");

    const prompt = PROMPTS.respuesta
      .replace("{{mensaje}}", mensaje)
      .replace("{{data}}", JSON.stringify(data, null, 2))
      .replace("{{historial}}", historialTexto);

    try {
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const respuesta = result.response.text().trim();
      return respuesta || "Mmm... me perdí un poco. ¿Podés repetir eso?";
    } catch (err) {
      console.warn("Error generando contenido:", err);
      return "Estoy medio trabado para responderte ahora. ¿Podés decirme eso de nuevo o con otras palabras?";
    }
  } catch (error) {
    console.error("Error general del chatbot:", error);
    return "Hubo un problema al responderte. ¿Podés intentar otra vez?";
  }
}

export { generateResponse };
