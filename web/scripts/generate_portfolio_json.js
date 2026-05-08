/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const PORTFOLIO_DIR = path.resolve(__dirname, '../../Portfolio');
const OUTPUT_FILE = path.resolve(__dirname, '../public/portfolio.json');

async function processDirectory(dir, category = '', subCategory = '') {
  let entries = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  const normalizeHtml = (html) => {
    if (!html) return '';
    return html
      .replace(/\r\n/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  };

  const textToParagraphHtml = (text) => {
    const safeText = (text || '').trim();
    if (!safeText) return '';
    return `<p>${safeText.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />')}</p>`;
  };
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    
    if (item.isDirectory()) {
      if (!category) {
        // e.g. "Blog Articles"
        entries = entries.concat(await processDirectory(fullPath, item.name, ''));
      } else if (!subCategory) {
        // e.g. "Blogging - SaaS"
        entries = entries.concat(await processDirectory(fullPath, category, item.name));
      } else {
        // Handle deeper logic if needed
        entries = entries.concat(await processDirectory(fullPath, category, subCategory));
      }
    } else {
      const ext = path.extname(item.name).toLowerCase();
      let text = '';
      
      try {
        if (ext === '.docx') {
          // Preserve headings, lists, bold/italic/underline and paragraph structure from DOCX.
          const res = await mammoth.convertToHtml({ path: fullPath }, {
            styleMap: [
              "u => u",
              "strike => s"
            ]
          });
          text = normalizeHtml(res.value);
        } else if (ext === '.pdf') {
          const data = await pdfParse(fs.readFileSync(fullPath));
          text = data.text;
        } else if (ext === '.txt') {
          text = fs.readFileSync(fullPath, 'utf8');
        } else {
          console.log(`Skipping unsupported file: ${fullPath}`);
          continue;
        }
        
        let title = path.basename(item.name, ext);
        
        if (text.trim()) {
           const content = ext === '.docx' ? text : textToParagraphHtml(text);
           entries.push({
             title: title,
             slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
             content,
             category: category || 'Uncategorized',
             subCategory: subCategory || '',
             published: true,
             featuredImage: ''
           });
           console.log(`Processed: ${item.name} -> ${category} / ${subCategory}`);
        }
      } catch (err) {
         console.error(`Error parsing ${fullPath}:`, err.message);
      }
    }
  }
  return entries;
}

async function main() {
  console.log(`Scanning directory: ${PORTFOLIO_DIR}`);
  const posts = await processDirectory(PORTFOLIO_DIR);
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(posts, null, 2), 'utf-8');
  console.log(`\nSuccess! Wrote ${posts.length} entries to ${OUTPUT_FILE}`);
}

main();
