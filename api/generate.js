import { GoogleGenAI } from '@google/genai';

const json = (res, status, body) => res.status(status).json(body);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Use POST.' });
  if (!process.env.GEMINI_API_KEY) return json(res, 500, { error: 'Add GEMINI_API_KEY in the server environment.' });

  const { mode, question, context } = req.body ?? {};
  if (!['rag', 'summarize'].includes(mode)) return json(res, 400, { error: 'Unknown request type.' });
  if (typeof question !== 'string' || question.length > 3000) return json(res, 400, { error: 'Enter a shorter question.' });
  if (typeof context !== 'string' || !context.trim()) return json(res, 400, { error: 'There is no page or document text to use.' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const instruction = mode === 'summarize'
      ? 'Summarize the supplied website text for a general reader. Give a clear title, a short overview, and 3 useful key points. Say when the text does not contain enough information.'
      : 'Answer the question using only the supplied retrieved document passages. If they do not answer it, say so. Keep the answer concise.';
    const result = await ai.models.generateContent({
      model: 'gemini-3.5-flash-lite',
      contents: `${instruction}\n\n${mode === 'rag' ? `Question: ${question}\n\nRetrieved passages:` : ''}\n${context.slice(0, 24000)}`,
    });
    return json(res, 200, { answer: result.text ?? 'The model returned an empty answer.' });
  } catch (error) {
    console.error('Gemini request failed:', error.message);
    return json(res, 502, { error: 'The AI request failed. Check the API key, free-tier limits, and try again.' });
  }
}
