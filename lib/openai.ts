import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY_CHATBOT) {
  throw new Error("OPENAI_API_KEY_CHATBOT environment variable is not set");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY_CHATBOT,
});
