import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { generateEmbedding } from './lib/llm';

export type DocumentData = {
  name: string;
  content: string;
  category?: string;
  tags?: string[];
};

class Store {
  documents: DocumentData[] = [];
  listeners: (() => void)[] = [];
  initialized = false;

  async init() {
    if (this.initialized) return;
    this.initialized = true;
    try {
      await this.refetch();
      
      // Subscribe to real-time changes
      supabase.channel('public:documents')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, () => {
          console.log('Real-time change detected in Supabase. Refetching documents...');
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
    // Optimistic local update
    this.documents.push(doc);
    this.notify();

    try {
      // 1. Persist document to Supabase
      const { data: docData, error: docError } = await supabase.from('documents').insert([{ 
        name: doc.name, 
        content: doc.content,
        category: doc.category,
        tags: doc.tags
      }]).select('id').single();

      if (docError) throw docError;
      if (!docData) throw new Error('No document ID returned');

      // 2. Chunk text and generate embeddings
      const chunkSize = 1000; // Overlapping chunks can be implemented later
      const chunks = [];
      for (let i = 0; i < doc.content.length; i += chunkSize) {
        chunks.push(doc.content.substring(i, i + chunkSize));
      }

      // 3. Save chunks and embeddings
      for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const embedding = await generateEmbedding(chunk);
        const { error: chunkError } = await supabase.from('document_chunks').insert([{
          document_id: docData.id,
          chunk_text: chunk,
          embedding: embedding
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
    globalStore.init(); // Fetch existing docs on first use
    return globalStore.subscribe(() => {
      setDocs([...globalStore.documents]);
    });
  }, []);
  return docs;
}
