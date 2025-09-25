import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = process.env.GEMINI_API_KEY || 'AIzaSyAp5APT1c_GHyB99qlqOEnv81LuV5aC0ZA';

if (!geminiApiKey) {
  console.error('Gemini API Key is missing. Please check your .env file.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey!);

// Using Gemini 2.0 Flash for better performance and accuracy
export const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.1, // Low temperature for more consistent, accurate responses
    topK: 1,
    topP: 0.8,
    maxOutputTokens: 4096,
  },
});