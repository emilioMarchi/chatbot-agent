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

const corsOptions = {
  origin: ["https://asistente-ai-front.vercel.app", "http://localhost:3000"], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
dotenv.config();

// Inicializar la Base de Conocimientos para RAG
initializeKnowledgeBase().catch(console.error);

// Conexión a Firebase
connectFirestore();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



import intentionRouter from './routes/intention.js'
app.use("/chatbot", intentionRouter);

import voiceSessionRouter from './routes/voiceSesion.js';
app.use('/voice-session', voiceSessionRouter);


import metaWebHook from './routes/metaWebHook.js'
app.use('/wpp', metaWebHook)
// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor chatbot corriendo 🟢");
});

// Puerto
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
