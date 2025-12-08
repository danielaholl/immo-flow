const pdfParse = require('pdf-parse');
console.log('Module type:', typeof pdfParse);
console.log('Module keys:', Object.keys(pdfParse));
console.log('Is function?', typeof pdfParse === 'function');
console.log('Constructor name:', pdfParse.constructor?.name);
console.log('Default property:', pdfParse.default);
console.log('Full module:', pdfParse);
