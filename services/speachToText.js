import fs from "fs";
import textToSpeechLib from "@google-cloud/text-to-speech";
import speech from "@google-cloud/speech";

const ttsClient = new textToSpeechLib.TextToSpeechClient();
const sttClient = new speech.SpeechClient();

// Texto -> Audio
async function textToSpeech(text, outputPath) {
  const request = {
    input: { text },
    voice: { languageCode: "es-ES", name: "es-US-Standard-C" },
    audioConfig: { audioEncoding: "MP3" },
  };

  const [response] = await ttsClient.synthesizeSpeech(request);
  fs.writeFileSync(outputPath, response.audioContent, "binary");
  return outputPath;
}

// Audio -> Texto
async function speechToText(audioBuffer) {
  try {
    const request = {
      audio: { content: audioBuffer.toString("base64") },
      config: {
        encoding: "WEBM_OPUS", // si grabás con MediaRecorder en webm
        sampleRateHertz: 48000,
        languageCode: "es-ES",
      },
    };

    const [response] = await sttClient.recognize(request);

    if (!response.results || response.results.length === 0) return "";

    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join(" ");

    return transcription;
  } catch (error) {
    console.error("Error en STT:", error);
    return "";
  }
}

export { textToSpeech, speechToText };
