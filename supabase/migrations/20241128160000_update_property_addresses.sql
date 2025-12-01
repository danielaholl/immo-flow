-- Update property addresses with PLZ and street names

-- Berlin Mitte
UPDATE properties
SET
  location = '10115 Berlin, Mitte',
  address = 'Friedrichstraße 123'
WHERE title = 'Moderne 3-Zimmer Wohnung in Berlin Mitte';

-- München Schwabing
UPDATE properties
SET
  location = '80801 München, Schwabing',
  address = 'Leopoldstraße 45'
WHERE title = 'Charmante Altbauwohnung in München Schwabing';

-- Hamburg Hafencity
UPDATE properties
SET
  location = '20457 Hamburg, HafenCity',
  address = 'Am Sandtorkai 56'
WHERE title = 'Luxus-Penthouse mit Dachterrasse Hamburg';

-- Köln Ehrenfeld
UPDATE properties
SET
  location = '50823 Köln, Ehrenfeld',
  address = 'Venloer Straße 234'
WHERE title = 'Renovierte 2-Zimmer Wohnung in Köln Ehrenfeld';

-- Frankfurt Westend
UPDATE properties
SET
  location = '60325 Frankfurt, Westend',
  address = 'Bockenheimer Landstraße 78'
WHERE title = 'Großzügige Familienwohnung Frankfurt Westend';

-- Stuttgart Mitte
UPDATE properties
SET
  location = '70173 Stuttgart, Mitte',
  address = 'Königstraße 89'
WHERE title = 'Stylisches Loft in Stuttgart Mitte';

-- München Schwabing (duplicate)
UPDATE properties
SET
  location = '80803 München, Schwabing',
  address = 'Hohenzollernstraße 12'
WHERE title = 'Charmante Altbauwohnung mit Balkon'
  AND location ILIKE '%münchen%';

-- Berlin Prenzlauer Berg
UPDATE properties
SET
  location = '10435 Berlin, Prenzlauer Berg',
  address = 'Kastanienallee 67'
WHERE title = 'Charmante Altbauwohnung mit Balkon'
  AND location ILIKE '%berlin%';
