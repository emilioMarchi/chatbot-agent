import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import speech from "@google-cloud/speech";


const sttClient = new speech.SpeechClient();

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_API_KEY
});

// Función helper para leer un ReadableStream a Buffer
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// Texto -> Audio con ElevenLabs
async function textToSpeech(text, outputPath) {
  try {
    const audioStream = await elevenlabs.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
      text,
      modelId: "eleven_multilingual_v2",

      outputFormat: "mp3_44100_128",
      stability: 0.5,       // control de "consistencia" de la voz, 0 a 1
      similarityBoost: 0.5, // qué tanto se parece al voiceId original, 0 a 1
      style: "happy",       // puede ser "neutral", "sad", "happy", etc. según el voiceId
      pitch: 1.2,           // ajuste del tono, >1 más agudo, <1 más grave
      rate: 1.2             // velocidad de habla, >1 más rápido, <1 más lento
    });

    // audioStream es un ReadableStream → convertimos a Buffer
    const buffer = await streamToBuffer(audioStream);

    fs.writeFileSync(outputPath, buffer);
    return outputPath;

  } catch (err) {
    console.error("Error TTS ElevenLabs:", err);
    throw err;
  }
}

// Audio -> Texto con Google STT
async function speechToText(audioBuffer) {
  try {
    const request = {
      audio: { content: audioBuffer.toString("base64") },
      config: {
        encoding: "WEBM_OPUS",
        sampleRateHertz: 48000,
        languageCode: "es-ES",
      },
    };

    const [response] = await sttClient.recognize(request);

    if (!response.results || response.results.length === 0) return "";

    return response.results
      .map(r => r.alternatives[0].transcript)
      .join(" ");
  } catch (err) {
    console.error("Error STT:", err);
    return "";
  }
}

export { textToSpeech, speechToText };
