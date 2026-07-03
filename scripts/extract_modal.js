const fs = require('fs');
const content = fs.readFileSync('src/pages/OrcamentosPage.tsx', 'utf-8');

const startTag = '<Dialog open={open} onOpenChange={setOpen}>';
const startIdx = content.indexOf(startTag);

const searchStr = '          </Dialog>\n        }\n      />';
const endIdx = content.indexOf(searchStr);

if (startIdx !== -1 && endIdx !== -1) {
    const modalContent = content.substring(startIdx, endIdx + 20);
    fs.writeFileSync('src/components/orcamentos/OrcamentoFormModalJSX.txt', modalContent);
    console.log('Extracted modal JSX successfully.');
} else {
    console.log('Failed to find tags. startIdx:', startIdx, 'endIdx:', endIdx);
}
