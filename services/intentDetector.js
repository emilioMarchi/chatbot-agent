import genAI from "../config/gemini.js";
const PROMPTS = {
  intencionesMultiple: `
Tu tarea es identificar todas las intenciones presentes en el siguiente mensaje de un usuario. Las categorías posibles son:

- saludo
- compra
- queja
- consulta
- otro

Devuelve un listado ordenado de las intenciones encontradas, separadas por comas, sin texto adicional.

Ejemplos:
"Hola, ¿cómo andan? Quiero comprar un producto." → saludo, compra
"Ya hice un pedido y no me llegó, ¿qué hago?" → queja, consulta
"Buenos días" → saludo
"Mensaje sin intención clara" → otro

Mensaje a analizar:
`,
};

async function detectIntention(mensaje) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent({
      contents: [
        {
          parts: [
            { text: PROMPTS.intencionesMultiple },
            { text: mensaje },
          ],
        },
      ],
    });

    const intencionesTexto = result.response.text().trim();

    // Opcional: convertir el string en array y limpiar espacios
    const intencionesArray = intencionesTexto
      .split(",")
      .map((i) => i.trim())
      .filter(Boolean);

    return intencionesArray;
  } catch (error) {
    console.error("Error detectando intenciones múltiples:", error);
    throw error;
  }
}

export { detectIntention };
