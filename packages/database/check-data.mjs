import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lntoolqtllivzdkhvvqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudG9vbHF0bGxpdnpka2h2dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk2MzQsImV4cCI6MjA3OTczNTYzNH0.wkBFd1aqMySNHGXRYnz4kZs0ETOL4p6q_4fGQrVxz60';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, location, address')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Current property data:');
  data.forEach(p => {
    console.log(`- ${p.title}: location="${p.location}", address="${p.address}"`);
  });
}

checkData();
