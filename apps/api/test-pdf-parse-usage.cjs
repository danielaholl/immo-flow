const { PDFParse } = require('pdf-parse');
const fs = require('fs');

console.log('PDFParse type:', typeof PDFParse);
console.log('PDFParse prototype methods:', Object.getOwnPropertyNames(PDFParse.prototype));

// Try to parse the test PDF
const pdfBuffer = fs.readFileSync('/Users/my_macbook/Documents/workspace/immo-flow/test-property-expose.pdf');

// Test 1: Try instantiating the class
try {
  const parser = new PDFParse();
  console.log('Parser instance created:', typeof parser);
  console.log('Parser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
  
  // Try to parse
  parser.fromBuffer(pdfBuffer).then(data => {
    console.log('Parsed successfully!');
    console.log('Text length:', data.text?.length || 0);
    console.log('First 200 chars:', data.text?.substring(0, 200));
  }).catch(err => {
    console.error('Parse error:', err.message);
  });
} catch (error) {
  console.error('Instantiation error:', error.message);
}
