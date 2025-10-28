import OpenAI from 'openai';
import { resolveEndpoint } from '../ai/endpoint';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
  baseURL: resolveEndpoint(),
});

export async function generateModConcept(prompt: string): Promise<string> {
  if (!client.apiKey) {
    throw new Error('Missing OpenAI API key');
  }

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You help prototype modular game experiences.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 200,
  });

  return completion.choices[0]?.message?.content?.trim() ?? '';
}

export function getOpenAIClient() {
  return client;
}
