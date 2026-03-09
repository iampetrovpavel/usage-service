/**
 * Default OpenAI pricing per unit (per token, per character, or per minute).
 * Source: https://openai.com/api/pricing/
 */
export const DEFAULT_PRICES: Record<string, Record<string, string>> = {
  // GPT-4.1 family
  "gpt-4.1":      { input_tokens: "0.000002",   output_tokens: "0.000008" },
  "gpt-4.1-mini": { input_tokens: "0.0000004",  output_tokens: "0.0000016" },
  "gpt-4.1-nano": { input_tokens: "0.0000001",  output_tokens: "0.0000004" },
  // GPT-4o family
  "gpt-4o":       { input_tokens: "0.0000025",  output_tokens: "0.00001" },
  "gpt-4o-mini":  { input_tokens: "0.00000015", output_tokens: "0.0000006" },
  // o-series reasoning models
  "o3":           { input_tokens: "0.000002",    output_tokens: "0.000008" },
  "o3-mini":      { input_tokens: "0.0000011",   output_tokens: "0.0000044" },
  "o4-mini":      { input_tokens: "0.0000011",   output_tokens: "0.0000044" },
  "o1":           { input_tokens: "0.000015",    output_tokens: "0.00006" },
  "o1-mini":      { input_tokens: "0.000003",    output_tokens: "0.000012" },
  // Embedding models
  "text-embedding-3-small": { input_tokens: "0.00000002" },
  "text-embedding-3-large": { input_tokens: "0.00000013" },
  "text-embedding-ada-002": { input_tokens: "0.0000001" },
  // Audio transcription
  "whisper-1": { audio_minutes: "0.006" },
  // Text-to-speech
  "tts-1":    { characters: "0.000015" },
  "tts-1-hd": { characters: "0.00003" },
};
