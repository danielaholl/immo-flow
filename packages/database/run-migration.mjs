import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lntoolqtllivzdkhvvqf.supabase.co';
// Using anon key - this won't work for admin operations
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudG9vbHF0bGxpdnpka2h2dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk2MzQsImV4cCI6MjA3OTczNTYzNH0.wkBFd1aqMySNHGXRYnz4kZs0ETOL4p6q_4fGQrVxz60';

const supabase = createClient(supabaseUrl, supabaseKey);

// Try to use RPC to run raw SQL (if available)
async function tryRPC() {
  const sql = `
    UPDATE properties
    SET location = '10115 Berlin, Mitte', address = 'Friedrichstraße 123'
    WHERE title = 'Moderne 3-Zimmer Wohnung in Berlin Mitte';
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    console.log('RPC not available:', error.message);
    return false;
  }
  return true;
}

// The only way without service role key is to create a policy that allows public updates
// Or run the SQL migration via Supabase Dashboard

console.log('=== Current Database State ===');
const { data, error } = await supabase.from('properties').select('id, title, location, address');

if (data) {
  data.forEach(p => {
    console.log(`ID: ${p.id}`);
    console.log(`  Title: ${p.title}`);
    console.log(`  Location: ${p.location}`);
    console.log(`  Address: ${p.address}`);
    console.log('');
  });
}

console.log('\n=== Attempting RPC ===');
const rpcResult = await tryRPC();

if (!rpcResult) {
  console.log('\nTo update the data, you need to either:');
  console.log('1. Run the SQL migration in Supabase Dashboard SQL Editor');
  console.log('2. Use the Supabase CLI with service role key');
  console.log('3. Temporarily disable RLS for the update');
  
  console.log('\nSQL to run in Supabase Dashboard:');
  console.log('---');
  console.log(`
UPDATE properties SET location = '10115 Berlin, Mitte', address = 'Friedrichstraße 123' WHERE title = 'Moderne 3-Zimmer Wohnung in Berlin Mitte';
UPDATE properties SET location = '80801 München, Schwabing', address = 'Leopoldstraße 45' WHERE title = 'Charmante Altbauwohnung in München Schwabing';
UPDATE properties SET location = '20457 Hamburg, HafenCity', address = 'Am Sandtorkai 56' WHERE title = 'Luxus-Penthouse mit Dachterrasse Hamburg';
UPDATE properties SET location = '50823 Köln, Ehrenfeld', address = 'Venloer Straße 234' WHERE title = 'Renovierte 2-Zimmer Wohnung in Köln Ehrenfeld';
UPDATE properties SET location = '60325 Frankfurt, Westend', address = 'Bockenheimer Landstraße 78' WHERE title = 'Großzügige Familienwohnung Frankfurt Westend';
UPDATE properties SET location = '70173 Stuttgart, Mitte', address = 'Königstraße 89' WHERE title = 'Stylisches Loft in Stuttgart Mitte';
UPDATE properties SET location = '80803 München, Schwabing', address = 'Hohenzollernstraße 12' WHERE title = 'Charmante Altbauwohnung mit Balkon' AND location ILIKE '%münchen%';
UPDATE properties SET location = '10435 Berlin, Prenzlauer Berg', address = 'Kastanienallee 67' WHERE title = 'Charmante Altbauwohnung mit Balkon' AND location ILIKE '%berlin%';
  `);
}
