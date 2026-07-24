import { supabase } from './supabase'
import { generateEmbedding, generateResponse, generateLegalResponse, ragChat, type RAGCitation } from './llm'

export type ChatCitation = {
  doc: string
  page: number
  excerpt: string
  similarity?: number
}

const extractPageNumber = (text: string): number => {
  const pageMatch = text.match(/(?:\[Page\s*(\d+)\]|Page\s*(\d+))/i)
  if (pageMatch) {
    const p = parseInt(pageMatch[1] || pageMatch[2], 10)
    if (!isNaN(p) && p > 0) return p
  }
  return 1
}

async function localRagRetrieve(question: string, matchThreshold: number, matchCount: number) {
  const queryEmbedding = await generateEmbedding(question)
  const { data: matchedChunks, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
  })
  if (error) throw new Error(`Vector search failed: ${error.message}`)

  let chunks = matchedChunks || []

  if (chunks.length === 0) {
    const { data: fallbackDocs } = await supabase.from('documents').select('name, content').limit(3)
    if (fallbackDocs?.length) {
      chunks = fallbackDocs.map((d: { name: string; content: string }) => ({
        document_name: d.name,
        chunk_text: d.content.substring(0, 2000),
        similarity: 0.3,
      }))
    }
  }

  return chunks
}

function buildCitations(chunks: RAGCitation[] | Array<{ document_name?: string; chunk_text?: string; similarity?: number }>): ChatCitation[] {
  return chunks.slice(0, 3).map((c) => ({
    doc: c.document_name || 'Unknown',
    page: extractPageNumber(c.chunk_text || ''),
    excerpt: (c.chunk_text || '').length > 400 ? (c.chunk_text || '').substring(0, 400) + '...' : (c.chunk_text || ''),
    similarity: c.similarity,
  }))
}

/** Unified RAG chat: tries backend pipeline first, falls back to local Ollama + Supabase. */
export async function askRAG(
  question: string,
  mode: 'document' | 'legal',
  onChunk?: (text: string) => void,
): Promise<{ answer: string; citations: ChatCitation[] }> {
  const threshold = mode === 'legal' ? 0.1 : 0.15

  try {
    const result = await ragChat(question, mode, threshold, 15)
    return {
      answer: result.answer,
      citations: buildCitations(result.citations),
    }
  } catch (err) {
    if (!(err instanceof Error) || err.message !== 'LOCAL_RAG') {
      // Backend error — try local fallback if on localhost
      const isLocal = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      if (!isLocal) throw err
    }
  }

  // Local dev: client-side RAG
  const chunks = await localRagRetrieve(question, threshold, 5)
  const context = chunks
    .map((c: { document_name?: string; chunk_text?: string }) =>
      `Document: ${c.document_name}\nText: ${c.chunk_text}`)
    .join('\n\n---\n\n')

  const citations = buildCitations(chunks)
  const generate = mode === 'legal' ? generateLegalResponse : generateResponse
  const answer = await generate(question, context, 'llama-3.1-8b-instant', onChunk)

  return { answer, citations }
}
