const { PDFParse } = require('pdf-parse');
const fs = require('fs');

async function testParse() {
  const pdfBuffer = fs.readFileSync('/Users/my_macbook/Documents/workspace/immo-flow/test-property-expose.pdf');
  
  // Correct v2 API: use 'data' parameter
  const parser = new PDFParse({ data: pdfBuffer });
  const result = await parser.getText();
  
  await parser.destroy();
  
  console.log('SUCCESS!');
  console.log('Text length:', result.text.length);
  console.log('Text content:');
  console.log(result.text);
}

testParse().catch(err => console.error('Error:', err));
