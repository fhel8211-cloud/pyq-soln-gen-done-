import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  console.error('Gemini API Key is missing. Please check your .env file.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey!);

export const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
