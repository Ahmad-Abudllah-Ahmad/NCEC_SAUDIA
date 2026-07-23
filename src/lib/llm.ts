const getApiBase = () => {
  const customLlmUrl = import.meta.env.VITE_LLM_API_URL
  const backendUrl = import.meta.env.VITE_OCR_API_URL
  
  if (customLlmUrl) return customLlmUrl.replace(/\/$/, '')
  if (backendUrl) return backendUrl.replace(/\/$/, '')
  return 'http://localhost:11434'
}

const getEndpoints = () => {
  const base = getApiBase()
  const isBackend = !base.includes('11434')
  return {
    generate: isBackend ? `${base}/api/llm/generate` : `${base}/api/generate`,
    embeddings: isBackend ? `${base}/api/llm/embeddings` : `${base}/api/embeddings`,
  }
}

export async function generateResponse(prompt: string, context: string, model = 'llama3.2:1b'): Promise<string> {
  const systemPrompt = `You are a professional environmental AI assistant for the Saudi National Center for Environmental Compliance (NCEC). 
CRITICAL RULE: You MUST answer the user's question accurately based STRICTLY and ONLY on the provided context from the database documents below.
Do NOT use any outside knowledge. Do NOT make up information.
If the answer cannot be found entirely within the provided context, you MUST politely say: "I do not have enough information in the provided documents to answer this question."
Always respond in the same language as the user's question (Arabic or English).

Context Documents:
${context}
`;

  try {
    const endpoints = getEndpoints()
    const response = await fetch(endpoints.generate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('LLM error:', err);
    throw new Error('Could not connect to the AI model service. Please ensure the backend server or Ollama is running.');
  }
}

export async function generateEmbedding(text: string, model = 'nomic-embed-text'): Promise<number[]> {
  try {
    const endpoints = getEndpoints()
    const response = await fetch(endpoints.embeddings, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (err) {
    console.error('Embedding error:', err);
    throw new Error('Could not generate embedding. Ensure the AI backend or Ollama service is running.');
  }
}

export async function generateLegalResponse(prompt: string, context: string, model = 'llama3.2:1b'): Promise<string> {
  const systemPrompt = `You are a specialized Executive AI Legal & Policy Assistant for staff of the Saudi National Center for Environmental Compliance (NCEC).
Your ONLY purpose is to assist staff with legal and policy matters: clause explanation, regulation suggestions, and similar-case retrieval.

CRITICAL FORMATTING & CONTENT RULES:
1. You MUST answer the user's question accurately based STRICTLY and ONLY on the provided context retrieved from the vector database below.
2. Do NOT use outside knowledge. Do NOT hallucinate or invent legal clauses.
3. FORMAT YOUR RESPONSE PROFESSIONALLY IN MARKDOWN:
   - Use clear Markdown headings (e.g., ## Executive Legal Summary, ## Applicable Articles & Regulations, ## Statutory Recommendations).
   - Use bold text for Article/Clause names, fines, and key legal terms.
   - Use clean bullet points for requirements or steps.
   - DO NOT output raw prompt strings, page symbol dumps (e.g., [Page X], raw brackets, or unparsed code), or document header artifacts. Synthesize clean, human-readable, professional legal prose.
4. If the user's query is not related to legal or policy matters, or if the required answer is NOT contained in the provided vector database context below, respond ONLY with:
"I do not have legal or policy information in the database to answer this request." (or in Arabic if the query is in Arabic: "لا تتوفر معلومات قانونية أو تنظيمية في قاعدة البيانات للإجابة على هذا الطلب.")
5. Always respond in the same language as the user's question (Arabic or English).

Context Documents from Vector Database:
${context}
`;

  try {
    const endpoints = getEndpoints()
    const response = await fetch(endpoints.generate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        system: systemPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response;
  } catch (err) {
    console.error('LLM error:', err);
    throw new Error('Could not connect to the AI model service. Please ensure the AI backend is running.');
  }
}

export async function translateText(text: string, targetLang: 'ar' | 'en', model = 'llama3.2:1b'): Promise<string> {
  const prompt = targetLang === 'ar'
    ? `Translate the following text accurately into Arabic. Preserve all markdown structure, bullet points, headers, numbers, and legal/technical terms. Return ONLY the translated text without commentary:\n\n${text}`
    : `Translate the following text accurately into English. Preserve all markdown structure, bullet points, headers, numbers, and legal/technical terms. Return ONLY the translated text without commentary:\n\n${text}`;

  try {
    const endpoints = getEndpoints()
    const response = await fetch(endpoints.generate, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (err) {
    console.error('Translation error:', err);
    throw err;
  }
}

