import fs from 'fs';
import genAI from '../config/gemini.js';

// 1. Cargar y "trocear" los datos.
const rawData = fs.readFileSync('./data.json');
const data = JSON.parse(rawData);

// Función para convertir un objeto en una cadena de texto legible para el LLM
function formatDocument(obj, type) {
  let content = `${type}:\n`;
  for (const [key, value] of Object.entries(obj)) {
    // Capitaliza la clave y reemplaza guiones bajos por espacios
    const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    content += `- ${formattedKey}: ${value}\n`;
  }
  return content;
}

const documents = [];
// Ahora los documentos se formatean como texto natural en lugar de JSON crudo.
// Esto ayuda al modelo a entender mejor el contexto.
data.eventos.forEach(e => documents.push(formatDocument(e, `Evento "${e.titulo}"`)));
data.talleres.forEach(t => documents.push(formatDocument(t, `Taller de "${t.nombre}"`)));
documents.push(formatDocument(data.espacio, 'Sobre el Espacio'));
documents.push(formatDocument(data.contacto, 'Contacto'));
documents.push(formatDocument(data.servicios, 'Servicios'));

let knowledgeBase;
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Función para calcular la similitud entre dos vectores (producto punto)
function dotProduct(vecA, vecB) {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

// 2. Crear los vectores (embeddings) y guardarlos en memoria.
async function initializeKnowledgeBase() {
  if (knowledgeBase) return; // Evitar reinicializar

  console.log("🧠 Inicializando la base de conocimientos...");
  
  const result = await embeddingModel.batchEmbedContents({
    requests: documents.map(text => ({ model: "models/text-embedding-004", content: { parts: [{text}] } })),
  });

  const embeddings = result.embeddings.map(e => e.values);
  
  knowledgeBase = documents.map((text, i) => ({
    text: text,
    embedding: embeddings[i],
  }));

  console.log(`✅ Base de conocimientos inicializada con ${knowledgeBase.length} documentos.`);
}

// 3. Función para buscar en la base de conocimientos
async function searchKnowledgeBase(query, topK = 3) {
  if (!knowledgeBase) {
    // Esto es importante: si el servidor recién arranca, la inicialización puede no haber terminado.
    // En un sistema de producción, se podría esperar a que termine o tener un estado más robusto.
    // Por ahora, lanzamos un error claro.
    throw new Error("La base de conocimientos no está inicializada o está en proceso. Intente de nuevo en unos segundos.");
  }

  const queryEmbeddingResult = await embeddingModel.embedContent(query);
  const queryEmbedding = queryEmbeddingResult.embedding.values;

  const similarities = knowledgeBase.map(doc => ({
    text: doc.text,
    similarity: dotProduct(queryEmbedding, doc.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, topK).map(item => item.text).join('\n\n');
}

export { initializeKnowledgeBase, searchKnowledgeBase };
