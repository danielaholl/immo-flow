const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function testParse() {
  const pdfBuffer = fs.readFileSync('/Users/my_macbook/Documents/workspace/immo-flow/test-property-expose.pdf');
  
  // Method 1: Pass buffer directly
  const parser = new PDFParse({ buffer: pdfBuffer });
  const result = await parser.getText();
  
  console.log('SUCCESS!');
  console.log('Text length:', result.text.length);
  console.log('First 500 chars:');
  console.log(result.text.substring(0, 500));
}

testParse().catch(err => console.error('Error:', err));
