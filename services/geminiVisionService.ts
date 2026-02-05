// AERA Vision Service - Powered by GROQ
// Replaces Gemini Vision for analyzing camera frames

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// UPDATED: Using the specific model ID you provided from your available list
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const log = {
  info: (msg: string, data?: unknown) => console.log(`[GROQ VISION] ℹ️ ${msg}`, data ?? ''),
  error: (msg: string, data?: unknown) => console.error(`[GROQ VISION] ❌ ${msg}`, data ?? ''),
};

export class GeminiVisionError extends Error {
  constructor(message: string, public statusCode?: number, public isRetryable = false) {
    super(message);
    this.name = 'GroqVisionError';
  }
}

const VISION_SYSTEM_PROMPT = `Ti je sytë e AERA, një pasqyrë inteligjente.
- Përshkruaj çfarë sheh në imazh shkurtimisht në Shqip.
- Nëse sheh një person, jep një kompliment të lehtë për veshjen ose stilin.
- Nëse të pyesin "çfarë është kjo", trego objektin.
- Mos përdor markdown. Përgjigju në 2 fjali maksimumi.`;

export async function analyzeImageWithGemini(
  imageBase64: string,
  question: string
): Promise<string> {
  log.info('Analyzing image...', { question, model: VISION_MODEL });

  if (!API_KEY) throw new Error('VITE_GROQ_API_KEY is missing');

  // Format image for Groq (OpenAI compatible format)
  const imageUrl = imageBase64.startsWith('data:') 
    ? imageBase64 
    : `data:image/jpeg;base64,${imageBase64}`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: `${VISION_SYSTEM_PROMPT}\n\nPyetja e përdoruesit: ${question}` },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        temperature: 0.5,
        max_tokens: 150
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      log.error(`API Error ${response.status}`, err);
      
      // Fallback logic: If Llama 4 fails, suggest standard Llama 3.2
      if (response.status === 400 || response.status === 404) {
         throw new GeminiVisionError(`Model Error (${VISION_MODEL}). Try using 'llama-3.2-11b-vision-preview' if this fails.`);
      }
      throw new GeminiVisionError(`Groq Vision Error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content;

    if (!result) throw new Error('No content returned from Vision API');

    log.info('Analysis complete');
    return result;

  } catch (error) {
    log.error('Analysis failed', error);
    throw new GeminiVisionError('Failed to analyze image');
  }
}

// Helpers
export async function captureImageFromVideo(videoElement: HTMLVideoElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = videoElement.videoWidth || 640;
  canvas.height = videoElement.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No canvas context');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export async function captureImageFromUrl(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('No context')); return; }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = (e) => reject(e);
    img.src = `${imageUrl}?t=${Date.now()}`;
  });
}

export async function captureImageFromBrowserCamera(): Promise<string> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640 } });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    await new Promise(r => video.onloadedmetadata = r);
    
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0);
    
    stream.getTracks().forEach(t => t.stop());
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch (e) {
    console.error("Camera access failed", e);
    // Specific error message for the user log
    throw new GeminiVisionError('Camera Permission Denied: Please click the Lock 🔒 icon in your browser address bar and Allow Camera access.');
  }
}

export function isVisionQuestion(text: string): boolean {
  const keywords = ['shiko', 'shih', 'dukem', 'vesh', 'veshja', 'ngjyra', 'look', 'wearing', 'see'];
  return keywords.some(k => text.toLowerCase().includes(k));
}

export const RANDOM_QUESTIONS = [
  'Si dukem sot?',
  'Çfarë këshille ke për mua?',
  'Trego një fakt interesant.',
  'Si është moti (në përgjithësi)?'
];

export function getRandomQuestion() {
  return RANDOM_QUESTIONS[Math.floor(Math.random() * RANDOM_QUESTIONS.length)];
}