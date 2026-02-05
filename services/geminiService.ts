// AERA AI Service - Powered by GROQ (Llama 3.3)
// Replaces Gemini for ultra-low latency responses (critical for voice)

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Model: Llama 3.3 70B Versatile (Best balance of speed/intelligence)
const MODEL_NAME = 'llama-3.3-70b-versatile';

const log = {
  info: (msg: string, data?: unknown) => console.log(`[GROQ] ℹ️ ${msg}`, data ?? ''),
  error: (msg: string, data?: unknown) => console.error(`[GROQ] ❌ ${msg}`, data ?? ''),
};

// Error compatibility class
export class GeminiApiError extends Error {
  constructor(message: string, public statusCode?: number, public isRetryable = false) {
    super(message);
    this.name = 'GroqApiError';
  }
}

export class GeminiConfigError extends Error {
  constructor(message: string) { super(message); this.name = 'ConfigError'; }
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `Ti je AERA, një pasqyrë inteligjente futuristike.
- Fol vetëm Shqip.
- Përgjigju shkurt dhe saktë (maksimumi 2 fjali).
- Ji e sjellshme, pak misterioze, por shumë e dobishme.
- Mos përdor formatting (bold/italic), vetëm tekst të thjeshtë për t'u lexuar me zë.
- Nëse të pyesin për orën ose datën, përgjigju bazuar në kohën aktuale.`;

let conversationHistory: ChatMessage[] = [];

export async function sendMessageToGemini(userMessage: string): Promise<string> {
  if (!API_KEY) throw new GeminiConfigError('VITE_GROQ_API_KEY is missing');

  // Initialize history if empty
  if (conversationHistory.length === 0) {
    conversationHistory.push({ role: 'system', content: SYSTEM_PROMPT });
  }

  conversationHistory.push({ role: 'user', content: userMessage });
  log.info('Sending request...', { length: userMessage.length });

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: MODEL_NAME,
        temperature: 0.6,
        max_tokens: 200, // Short answers for voice
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      // Handle Rate Limits (429) specifically
      if (response.status === 429) {
        throw new GeminiApiError('Groq Rate Limit - Too fast', 429, true);
      }
      throw new GeminiApiError(`Groq Error: ${response.status}`, response.status);
    }

    const data = await response.json();
    const reply = data.choices[0]?.message?.content || "Më falni, nuk arrita të përgjigjem.";

    conversationHistory.push({ role: 'assistant', content: reply });
    
    // Memory Management: Keep context small for speed (System + Last 6 messages)
    if (conversationHistory.length > 7) {
      conversationHistory = [
        conversationHistory[0], 
        ...conversationHistory.slice(-6)
      ];
    }

    return reply;

  } catch (error) {
    log.error('Request failed', error);
    conversationHistory.pop(); // Remove failed user message
    throw error;
  }
}

// Streaming Implementation (for even faster perception)
export async function* streamMessageToGemini(userMessage: string): AsyncGenerator<string> {
  if (!API_KEY) throw new GeminiConfigError('API Key missing');

  if (conversationHistory.length === 0) {
    conversationHistory.push({ role: 'system', content: SYSTEM_PROMPT });
  }
  conversationHistory.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        messages: conversationHistory,
        model: MODEL_NAME,
        temperature: 0.6,
        max_tokens: 200,
        stream: true
      }),
    });

    if (!response.ok) throw new GeminiApiError(`Stream Error: ${response.status}`);
    if (!response.body) throw new Error('No body');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json.choices[0]?.delta?.content;
            if (content) {
              fullResponse += content;
              yield content;
            }
          } catch (e) { /* ignore parse errors */ }
        }
      }
    }

    conversationHistory.push({ role: 'assistant', content: fullResponse });

  } catch (error) {
    log.error('Stream failed', error);
    conversationHistory.pop();
    throw error;
  }
}

export function resetConversation() {
  conversationHistory = [];
}

export function getConversationLength() {
  return conversationHistory.length;
}