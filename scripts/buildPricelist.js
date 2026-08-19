import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// RFC-4180 Compliant CSV Parser
function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip second quote
        } else {
          inQuotes = false; // Quote closed
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\r') {
        // Skip CR
      } else if (char === '\n') {
        currentRow.push(currentField.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function cleanPrice(val) {
  if (!val) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = val.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function run() {
  const pricelistDir = path.join(__dirname, '../pricelist');
  const outputDir = path.join(__dirname, '../src/data');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (!fs.existsSync(pricelistDir)) {
    const existingFile = path.join(outputDir, 'pricelistData.json');
    if (fs.existsSync(existingFile)) {
      console.log('pricelist directory not found. Using existing src/data/pricelistData.json');
      return;
    }
    console.log('pricelist directory not found. Creating fallback src/data/pricelistData.json');
    fs.writeFileSync(existingFile, '[]', 'utf8');
    return;
  }

  const files = fs.readdirSync(pricelistDir).filter(f => f.endsWith('.csv'));
  const products = [];
  let idCounter = 1;

  for (const file of files) {
    const filePath = path.join(pricelistDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const rows = parseCSV(content);

    if (rows.length <= 1) continue;
    const header = rows[0];

    // Map column names dynamically
    const brandIdx = header.findIndex(h => h.toUpperCase().includes('BRAND'));
    const typeIdx = header.findIndex(h => h.toUpperCase().includes('TYPE'));
    const modelIdx = header.findIndex(h => h.toUpperCase().includes('MODEL'));
    const priceIdx = header.findIndex(h => h.toUpperCase() === 'PRICE');
    const descIdx = header.findIndex(h => h.toUpperCase().includes('ITEM_DESCRIPTION') || h.toUpperCase().includes('DESCRIPTION'));
    
    // Tiered pricing columns
    const endUserBelow20 = header.findIndex(h => h.includes('PRICE (If end-user AND 20 pieces or below)'));
    const contractorBelow20 = header.findIndex(h => h.includes('CONTRACTOR PRICE (20 pieces or below)'));
    const dealerBelow20 = header.findIndex(h => h.includes('DEALER PRICE (20 pieces or below)'));

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const brand = brandIdx >= 0 ? row[brandIdx] || '' : '';
      const type = typeIdx >= 0 ? row[typeIdx] || '' : '';
      const model = modelIdx >= 0 ? row[modelIdx] || '' : '';
      const rawPrice = priceIdx >= 0 ? row[priceIdx] || '0' : '0';
      const description = descIdx >= 0 ? row[descIdx] || '' : '';

      const price = cleanPrice(rawPrice);
      const endUserPrice = endUserBelow20 >= 0 ? cleanPrice(row[endUserBelow20]) : price;
      const contractorPrice = contractorBelow20 >= 0 ? cleanPrice(row[contractorBelow20]) : price;
      const dealerPrice = dealerBelow20 >= 0 ? cleanPrice(row[dealerBelow20]) : price;

      // Skip rows with no model and no description or invalid model markers like 'No Information'
      if ((!model || model.toUpperCase() === 'NO INFORMATION') && (!description || description.toUpperCase() === 'NO INFORMATION')) {
        continue;
      }

      // Infer clean brand from filename if blank
      let cleanBrand = brand.trim();
      if (!cleanBrand) {
        const brandMatch = file.match(/\[NEW\]\s*([A-Z0-9\s]+?)\s*PRODUCT/i) || file.match(/([A-Z0-9\s]+?)\.csv/i);
        cleanBrand = brandMatch ? brandMatch[1].trim() : 'Generic';
      }

      products.push({
        id: `PL-${idCounter++}`,
        brand: cleanBrand,
        type: type.trim(),
        model: model.trim(),
        price,
        contractorPrice: contractorPrice || price,
        dealerPrice: dealerPrice || price,
        endUserPrice: endUserPrice || price,
        description: description.trim(),
        sourceFile: file
      });
    }
  }

  console.log(`Successfully parsed ${products.length} products from ${files.length} pricelist CSV files.`);

  // Write JSON
  const outputPath = path.join(outputDir, 'pricelistData.json');
  fs.writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf8');
  console.log(`Saved product catalog to ${outputPath} (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

run();
