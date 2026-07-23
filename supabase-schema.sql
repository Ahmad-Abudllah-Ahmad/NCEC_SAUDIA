-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- Ensure documents table exists
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  content text not null,
  category text,
  tags text[],
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Create a table to store document chunks and their embeddings
create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  chunk_text text not null,
  embedding vector(768) -- nomic-embed-text uses 768 dimensions
);

-- Create an index for faster similarity search
create index on document_chunks using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Create the match_document_chunks function for semantic similarity search
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  document_id uuid,
  document_name text,
  chunk_text text,
  similarity float
)
language sql stable
as $$
  select
    dc.document_id,
    d.name as document_name,
    dc.chunk_text,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
