// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Replace the two values below with your own Supabase project credentials.
// Find them in: Supabase Dashboard → Settings → API
//
//   SUPABASE_URL  = Project URL  (e.g. https://xyzxyz.supabase.co)
//   SUPABASE_KEY  = anon / public key

const SUPABASE_URL = 'https://jhfbihdmvluyagvtrnkh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoZmJpaGRtdmx1eWFndnRybmtoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MDIwODMsImV4cCI6MjA4NzQ3ODA4M30.IZvvkdgDNQRg6meQ8f1ytKgI5PlySvsB0s9sGTKZH_E';

// Create the global Supabase client (available as `db` throughout the app)
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
