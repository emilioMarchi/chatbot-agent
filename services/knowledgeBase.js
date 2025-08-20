// knowledgeBase.js
import fs from 'fs';
import genAI from '../config/gemini.js';

// 1. Cargar los datos
const rawData = fs.readFileSync('./data.json', 'utf8');
const data = JSON.parse(rawData);

// Función para capitalizar y reemplazar guiones bajos
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, ' ');
}

// Función genérica para formatear cualquier estructura de datos
function formatDocumentGeneric(key, value) {
  let content = `${capitalize(key)}:\n`;

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        content += `\n${capitalize(key)} ${index + 1}:\n`;
        for (const [subKey, subValue] of Object.entries(item)) {
          content += `- ${capitalize(subKey)}: ${subValue}\n`;
        }
      } else {
        content += `- ${item}\n`;
      }
    });
  } else if (typeof value === 'object' && value !== null) {
    for (const [subKey, subValue] of Object.entries(value)) {
      content += `- ${capitalize(subKey)}: ${subValue}\n`;
    }
  } else {
    content += `- Valor: ${value}\n`;
  }

  return content.trim();
}

// Convertir todo el JSON en documentos legibles
const documents = [];
for (const [key, value] of Object.entries(data)) {
  documents.push(formatDocumentGeneric(key, value));
}

// Variables globales para embeddings
let knowledgeBase;
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });

// Producto punto para similitud
function dotProduct(vecA, vecB) {
  let product = 0;
  for (let i = 0; i < vecA.length; i++) {
    product += vecA[i] * vecB[i];
  }
  return product;
}

// 2. Crear la base de conocimientos
async function initializeKnowledgeBase() {
  if (knowledgeBase) return; // Evitar reinicializar

  console.log("🧠 Inicializando la base de conocimientos...");

  const result = await embeddingModel.batchEmbedContents({
    requests: documents.map(text => ({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] }
    })),
  });

  const embeddings = result.embeddings.map(e => e.values);

  knowledgeBase = documents.map((text, i) => ({
    text: text,
    embedding: embeddings[i],
  }));

  console.log(`✅ Base de conocimientos inicializada con ${knowledgeBase.length} documentos.`);
}

// 3. Buscar en la base de conocimientos
async function searchKnowledgeBase(query, topK = 3, similarityThreshold = 0.7) {
  if (!knowledgeBase) {
    throw new Error("La base de conocimientos no está inicializada o está en proceso. Intente de nuevo en unos segundos.");
  }

  const queryEmbeddingResult = await embeddingModel.embedContent(query);
  const queryEmbedding = queryEmbeddingResult.embedding.values;

  const similarities = knowledgeBase.map(doc => ({
    text: doc.text,
    similarity: dotProduct(queryEmbedding, doc.embedding),
  }));

  similarities.sort((a, b) => b.similarity - a.similarity);

  // Filtrar solo los documentos que superen el umbral de similitud
  const filtered = similarities.filter(item => item.similarity >= similarityThreshold);

  return filtered.slice(0, topK).map(item => item.text).join('\n\n');
}

export { initializeKnowledgeBase, searchKnowledgeBase };
