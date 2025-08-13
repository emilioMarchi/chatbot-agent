import { getDB } from '../config/db.js';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const MAX_HISTORY_LENGTH = 20;

/**
 * Obtiene el historial de un usuario desde Firestore.
 * @param {string} userId - El identificador único del usuario.
 * @returns {Promise<Array>} - Una copia del historial del usuario.
 */
async function getHistory(userId) {
  const db = getDB();
  if (!db) {
    console.error("Firestore no está inicializado.");
    return [];
  }
  const docRef = doc(db, "conversations", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    // Devuelve el array de mensajes, o un array vacío si no existe el campo.
    return docSnap.data().messages || [];
  } else {
    // El documento no existe, así que el historial está vacío.
    return [];
  }
}

/**
 * Agrega un mensaje al historial de un usuario en Firestore.
  * @param {string} userId - El identificador único del usuario.
 * @param {{role: 'user' | 'bot', content: string}} message - El mensaje a agregar.
 */
async function saveHistory(userId, history) {
  const db = getDB();
  if (!db) {
    console.error("Firestore no está inicializado.");
    return;
  }
  const docRef = doc(db, "conversations", userId);

  // Asegurarse de que el historial no exceda el límite
  const newHistory = history.slice(-MAX_HISTORY_LENGTH);

  await setDoc(docRef, { messages: newHistory });
}

export { getHistory, saveHistory };

