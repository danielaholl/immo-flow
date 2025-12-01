import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lntoolqtllivzdkhvvqf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxudG9vbHF0bGxpdnpka2h2dnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNTk2MzQsImV4cCI6MjA3OTczNTYzNH0.wkBFd1aqMySNHGXRYnz4kZs0ETOL4p6q_4fGQrVxz60';

const supabase = createClient(supabaseUrl, supabaseKey);

// Address data for each property
const addressData = {
  'Moderne 3-Zimmer Wohnung in Berlin Mitte': {
    location: '10115 Berlin, Mitte',
    address: 'Friedrichstraße 123'
  },
  'Charmante Altbauwohnung in München Schwabing': {
    location: '80801 München, Schwabing',
    address: 'Leopoldstraße 45'
  },
  'Luxuriöses Penthouse in Frankfurt': {
    location: '60311 Frankfurt am Main',
    address: 'Kaiserstraße 78'
  },
  'Familienfreundliches Reihenhaus in Hamburg': {
    location: '22765 Hamburg, Ottensen',
    address: 'Bahrenfelder Straße 92'
  },
  'Renovierte Stadtwohnung in Köln': {
    location: '50667 Köln, Altstadt',
    address: 'Hohe Straße 34'
  },
  'Geräumige Maisonette in Düsseldorf': {
    location: '40213 Düsseldorf, Altstadt',
    address: 'Königsallee 56'
  },
  'Modernes Loft in Leipzig': {
    location: '04109 Leipzig, Zentrum',
    address: 'Grimmaische Straße 12'
  },
  'Elegante Villa in Stuttgart': {
    location: '70173 Stuttgart, Mitte',
    address: 'Königstraße 89'
  }
};

async function updateAddresses() {
  // First, get all properties
  const { data: properties, error: fetchError } = await supabase
    .from('properties')
    .select('id, title, location, address');

  if (fetchError) {
    console.error('Error fetching properties:', fetchError);
    return;
  }

  console.log(`Found ${properties.length} properties`);

  for (const property of properties) {
    const newData = addressData[property.title];
    
    if (newData) {
      console.log(`\nUpdating: ${property.title}`);
      console.log(`  Current: location="${property.location}", address="${property.address}"`);
      console.log(`  New: location="${newData.location}", address="${newData.address}"`);
      
      const { data, error } = await supabase
        .from('properties')
        .update({
          location: newData.location,
          address: newData.address
        })
        .eq('id', property.id)
        .select();

      if (error) {
        console.log(`  ERROR: ${error.message}`);
        console.log(`  Code: ${error.code}`);
        console.log(`  Details: ${error.details}`);
      } else if (data && data.length > 0) {
        console.log(`  SUCCESS - Updated location: "${data[0].location}", address: "${data[0].address}"`);
      } else {
        console.log(`  WARNING: Update returned no data (possibly RLS blocking)`);
      }
    } else {
      console.log(`\nNo address data for: ${property.title}`);
    }
  }

  // Verify final state
  console.log('\n\n=== VERIFICATION ===');
  const { data: finalData } = await supabase
    .from('properties')
    .select('title, location, address');
  
  finalData?.forEach(p => {
    console.log(`${p.title}:`);
    console.log(`  location: ${p.location}`);
    console.log(`  address: ${p.address}`);
  });
}

updateAddresses();
