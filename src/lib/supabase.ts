import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://bmqyetdfwhldnttidrha.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtcXlldGRmd2hsZG50dGlkcmhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ3MDY0OTQsImV4cCI6MjEwMDI4MjQ5NH0.MsRXAXfUFVoJRBO5oeKHdHrPSeq2Tj_WK24nEwSC9kM'

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Supabase integration will not work.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
