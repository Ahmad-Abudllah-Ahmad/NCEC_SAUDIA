const getApiBase = () => {
  const customLlmUrl = import.meta.env.VITE_LLM_API_URL
  const backendUrl = import.meta.env.VITE_OCR_API_URL

  if (customLlmUrl) return customLlmUrl.replace(/\/$/, '')
  if (backendUrl) return backendUrl.replace(/\/$/, '')

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://ncec-ocr-backend.onrender.com'
  }
  return 'http://localhost:11434'
}

const isOllamaDirect = () => getApiBase().includes('11434')

const getEndpoints = () => {
  const base = getApiBase()
  const isBackend = !base.includes('11434')
  return {
    generate: isBackend ? `${base}/api/llm/generate` : `${base}/api/generate`,
    embeddings: isBackend ? `${base}/api/llm/embeddings` : `${base}/api/embeddings`,
    ragChat: isBackend ? `${base}/api/rag/chat` : null,
  }
}

export type RAGCitation = {
  document_name: string
  chunk_text: string
  similarity: number
}

export type RAGChatResult = {
  answer: string
  citations: RAGCitation[]
  chunks_used: number
}

/** Primary RAG path: backend does embed → vector search → generate from context. */
export async function ragChat(
  question: string,
  mode: 'document' | 'legal' = 'document',
  matchThreshold = 0.15,
  matchCount = 5,
): Promise<RAGChatResult> {
  const endpoints = getEndpoints()

  // Production / Render: use server-side RAG pipeline
  if (endpoints.ragChat) {
    const res = await fetch(endpoints.ragChat, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        mode,
        match_threshold: matchThreshold,
        match_count: matchCount,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(errText || `RAG backend error (${res.status})`)
    }
    return res.json()
  }

  // Local dev: client-side RAG with direct Ollama + Supabase (handled by caller)
  throw new Error('LOCAL_RAG')
}

async function callGenerate(
  prompt: string,
  system: string,
  model: string,
  onChunk?: (text: string) => void,
): Promise<string> {
  const endpoints = getEndpoints()
  const response = await fetch(endpoints.generate, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      system,
      stream: isOllamaDirect(),
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(errText || `LLM error (${response.status})`)
  }

  // Ollama direct streaming
  if (isOllamaDirect() && response.body) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullText = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const data = JSON.parse(line)
          if (data.response) {
            fullText += data.response
            onChunk?.(data.response)
          }
        } catch { /* skip malformed lines */ }
      }
    }
    return fullText
  }

  // Backend JSON response
  const data = await response.json()
  const text = (data.response || '').trim()
  if (!text) throw new Error('LLM returned empty response')
  if (onChunk) onChunk(text)
  return text
}

export async function generateResponse(
  prompt: string,
  context: string,
  model = 'llama3.2:1b',
  onChunk?: (text: string) => void,
): Promise<string> {
  const systemPrompt = `You are a professional environmental AI assistant for the Saudi National Center for Environmental Compliance (NCEC).
CRITICAL RULE: Answer ONLY from the Context Documents below. Do NOT use outside knowledge.
If the answer is not in the context, say: "I do not have enough information in the provided documents to answer this question."
Respond in the same language as the user's question.`

  const fullPrompt = `Context Documents:\n${context}\n\nUser Question:\n${prompt}`
  return callGenerate(fullPrompt, systemPrompt, model, onChunk)
}

export async function generateEmbedding(text: string, model = 'nomic-embed-text'): Promise<number[]> {
  const endpoints = getEndpoints()
  const response = await fetch(endpoints.embeddings, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Embedding failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  if (!data?.embedding?.length) {
    throw new Error('Embedding API returned no vector — ensure Ollama is running with nomic-embed-text pulled')
  }
  return data.embedding
}

export async function generateLegalResponse(
  prompt: string,
  context: string,
  model = 'llama3.2:1b',
  onChunk?: (text: string) => void,
): Promise<string> {
  const systemPrompt = `You are a specialized Executive AI Legal & Policy Assistant for NCEC staff.
Answer ONLY from the Context Documents below. Do NOT hallucinate.
Format in Markdown with headings. If answer not in context, say:
"I do not have legal or policy information in the database to answer this request."
Respond in the same language as the user's question.`

  const fullPrompt = `Context Documents from Vector Database:\n${context}\n\nUser Question:\n${prompt}`
  return callGenerate(fullPrompt, systemPrompt, model, onChunk)
}

export async function translateText(text: string, targetLang: 'ar' | 'en', model = 'llama3.2:1b'): Promise<string> {
  const prompt = targetLang === 'ar'
    ? `Translate the following text accurately into Arabic. Preserve markdown structure. Return ONLY the translation:\n\n${text}`
    : `Translate the following text accurately into English. Preserve markdown structure. Return ONLY the translation:\n\n${text}`

  try {
    return await callGenerate(prompt, '', model)
  } catch (err) {
    console.warn('Translation warning:', err)
    return text
  }
}
