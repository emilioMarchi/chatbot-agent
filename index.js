// index.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { connectFirestore } from "./config/db.js";
import { initializeKnowledgeBase } from './services/knowledgeBase.js';

import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.json());
dotenv.config();

// Inicializar la Base de Conocimientos para RAG
initializeKnowledgeBase().catch(console.error);

// Conexión a Firebase
connectFirestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, 'public')));

import intentionRouter from './routes/intention.js'
app.use("/chatbot", intentionRouter);

import metaWebHook from './routes/metaWebHook.js'
app.use('/wpp', metaWebHook)
// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor chatbot corriendo 🟢");
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
