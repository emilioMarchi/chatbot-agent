import fs from "fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import speech from "@google-cloud/speech";
import textToSpeech from "@google-cloud/text-to-speech";

const sttClient = new speech.SpeechClient();
const ttsClient = new textToSpeech.TextToSpeechClient();

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

// -----------------------------
// ElevenLabs: Texto -> Audio
// -----------------------------
async function textToSpeechElevenLabs(text, outputPath) {
  try {
    const audioStream = await elevenlabs.textToSpeech.convert("21m00Tcm4TlvDq8ikWAM", {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
      stability: 0.1,
      similarityBoost: 0.8,
      style: "happy",
      pitch: 1.7,
      rate: 1.4
    });

    const buffer = await streamToBuffer(audioStream);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;

  } catch (err) {
    console.error("Error TTS ElevenLabs:", err);
    throw err;
  }
}

// -----------------------------
// Google Cloud TTS: Texto -> Audio
// -----------------------------
async function textToSpeechGoogle(text, outputPath) {
  try {
    const request = {
      input: { text },
      // Puedes ajustar voz, idioma, pitch, speakingRate
      voice: { languageCode: "es-ES", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", pitch: 1.7, speakingRate: 1.4 },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);
    fs.writeFileSync(outputPath, response.audioContent);
    return outputPath;

  } catch (err) {
    console.error("Error TTS Google:", err);
    throw err;
  }
}

// -----------------------------
// Google Cloud STT: Audio -> Texto
// -----------------------------
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

export { textToSpeechElevenLabs, textToSpeechGoogle, speechToText };
