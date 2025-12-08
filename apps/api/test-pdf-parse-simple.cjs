const pdfParse = require('pdf-parse');
const fs = require('fs');

console.log('Full module structure:');
console.log('  - typeof pdfParse:', typeof pdfParse);
console.log('  - pdfParse keys:', Object.keys(pdfParse));

// Check if there's a default function
if (typeof pdfParse.default === 'function') {
  console.log('\nTrying pdfParse.default()...');
  const pdfBuffer = fs.readFileSync('/Users/my_macbook/Documents/workspace/immo-flow/test-property-expose.pdf');
  pdfParse.default(pdfBuffer).then(data => {
    console.log('SUCCESS with default!');
    console.log('Text:', data.text.substring(0, 200));
  }).catch(err => console.error('Error:', err.message));
}

// Try PDFParse with options
console.log('\nTrying PDFParse class with options...');
const { PDFParse } = pdfParse;
const pdfBuffer = fs.readFileSync('/Users/my_macbook/Documents/workspace/immo-flow/test-property-expose.pdf');

try {
  const parser = new PDFParse({ verbosity: 0 });
  parser.fromBuffer(pdfBuffer).then(data => {
    console.log('SUCCESS with PDFParse class!');
    console.log('Data keys:', Object.keys(data));
  }).catch(err => console.error('Parse error:', err.message));
} catch (err) {
  console.error('Class instantiation error:', err.message);
}
