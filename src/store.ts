import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { generateEmbedding } from './lib/llm';

export type DocumentData = {
  name: string;
  content: string;
  category?: string;
  tags?: string[];
};

/** Chunk text with overlap for better retrieval quality. */
function chunkText(text: string, chunkSize = 1200, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + chunkSize, text.length);
    const slice = text.slice(i, end).trim();
    if (slice) chunks.push(slice);
    if (end >= text.length) break;
    i += chunkSize - overlap;
  }
  return chunks;
}

class Store {
  documents: DocumentData[] = [];
  listeners: (() => void)[] = [];
  initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await this.refetch();
      supabase.channel('public:documents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
          this.refetch();
        })
        .subscribe();
    } catch (err) {
      console.error('Failed to init Supabase:', err);
    }
  }

  async refetch() {
    try {
      const { data, error } = await supabase.from('documents').select('name, content, category, tags');
      if (error) throw error;
      if (data) {
        this.documents = data;
        this.notify();
      }
    } catch (err) {
      console.error('Failed to fetch from Supabase:', err);
    }
  }

  async addDocument(doc: DocumentData) {
    this.documents.push(doc);
    this.notify();

    try {
      const { data: docData, error: docError } = await supabase.from('documents').insert([{
        name: doc.name,
        content: doc.content,
        category: doc.category,
        tags: doc.tags,
      }]).select('id').single();

      if (docError) throw docError;
      if (!docData) throw new Error('No document ID returned');

      const chunks = chunkText(doc.content);

      for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk);
        const { error: chunkError } = await supabase.from('document_chunks').insert([{
          document_id: docData.id,
          chunk_text: chunk,
          embedding,
        }]);
        if (chunkError) console.error('Chunk insert error:', chunkError);
      }
    } catch (err) {
      console.error('Failed to save document or embeddings to Supabase:', err);
    }
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach((l) => l());
  }
}

export const globalStore = new Store();

export function useGlobalDocuments() {
  const [docs, setDocs] = useState(globalStore.documents);
  useEffect(() => {
    globalStore.init();
    return globalStore.subscribe(() => {
      setDocs([...globalStore.documents]);
    });
  }, []);
  return docs;
}
