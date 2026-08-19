import * as XLSX from 'xlsx';
import * as mammoth from 'mammoth';

export interface ParsedFile {
  fileName: string;
  fileType: string;
  content: string;
  size: number;
  error?: string;
}

function getExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() || '';
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.head.appendChild(s);
  });
}

let pdfjsPromise: Promise<any> | null = null;

async function getPdfjs(): Promise<any> {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  if (pdfjsPromise) return pdfjsPromise;

  pdfjsPromise = (async () => {
    await loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js');
    const pdfjs = (window as any).pdfjsLib;
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js';
    return pdfjs;
  })();

  return pdfjsPromise;
}

async function parsePDF(file: File): Promise<string> {
  const pdfjs = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item: any) => item.str).join(' ');
    pages.push(text);
  }
  return pages.join('\n\n--- Page Break ---\n\n');
}

async function parseXLSX(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const parts: string[] = [];

  // Roman numeral detector for section header rows — must be non-empty and match valid Roman numerals only
  const isRomanNumeral = (v: string) => {
    const s = v.trim().toUpperCase();
    return s.length > 0 && /^(XIV|XIII|XII|XI|IX|VIII|VII|VI|IV|III|II|XI|X|V|I)$/.test(s);
  };

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    // Remove fully blank rows
    const rows = json.filter(row => row.some(c => c !== '' && c != null));
    if (rows.length === 0) continue;

    parts.push(`\n=== Sheet: ${sheetName} ===`);

    // ── Step 1: Find the column header row ──────────────────────────────
    // Look for a row whose cells include keywords like DESCRIPTION, QTY, UNIT
    let colItemNo = -1, colDesc = -1, colQty = -1, colUnit = -1, colUnitPrice = -1, colSubTotal = -1;
    let headerRowIdx = -1;

    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i].map((c: any) => String(c ?? '').toUpperCase().trim());
      const hasDesc = row.findIndex(c => c.includes('DESCRIPTION') || c.includes('PRODUCT'));
      const hasQty  = row.findIndex(c => c === 'QTY' || c.includes('QUANTITY'));
      if (hasDesc !== -1 && hasQty !== -1) {
        headerRowIdx = i;
        colItemNo   = row.findIndex(c => c.includes('ITEM') || c.includes('NO'));
        colDesc     = hasDesc;
        colQty      = hasQty;
        colUnit     = row.findIndex(c => c === 'UNIT' || c.includes('UNIT/S') || c.includes('UNITS'));
        colUnitPrice = row.findIndex(c => c.includes('UNIT PRICE') || c.includes('UNIT COST'));
        colSubTotal  = row.findIndex(c => c.includes('SUB TOTAL') || c.includes('SUBTOTAL') || c.includes('TOTAL AMOUNT'));
        if (colUnit === -1) colUnit = colQty + 1; // fallback: column after qty
        break;
      }
    }

    // ── Step 2: If column detection succeeded, output structured items ──
    if (headerRowIdx !== -1 && colDesc !== -1) {
      let currentSection = '';

      for (let i = headerRowIdx + 1; i < rows.length; i++) {
        const row = rows[i];
        const itemNo  = colItemNo >= 0 ? String(row[colItemNo] ?? '').trim() : '';
        const desc    = String(row[colDesc] ?? '').trim().replace(/\n/g, ' ');
        const qty     = colQty >= 0 ? String(row[colQty] ?? '').trim() : '';
        const unit    = colUnit >= 0 ? String(row[colUnit] ?? '').trim() : '';
        const uprice  = colUnitPrice >= 0 ? String(row[colUnitPrice] ?? '').trim() : '';
        const sub     = colSubTotal >= 0 ? String(row[colSubTotal] ?? '').trim() : '';

        if (!desc) continue; // skip rows with no description

        // Detect TRUE section headings: only Roman numeral item numbers (I, II, III, IV...)
        if (isRomanNumeral(itemNo)) {
          currentSection = desc || itemNo;
          parts.push(`\n[SECTION: ${currentSection}]`);
          continue;
        }

        // Rows where itemNo is a non-numeric text (e.g. "GENERAL REQUIREMENTS:")
        // without qty are category labels, not products — skip as sub-section
        if (itemNo && !Number(itemNo) && !qty && !uprice) {
          parts.push(`  [Category Header (Extract exact brand/models from line items below, ignoring header labels if contradictory): ${desc}]`);
          continue;
        }

        // Rows with a numeric item number but no qty — these are lot groupings
        if (itemNo && Number(itemNo) && !qty && !uprice && !sub) {
          parts.push(`  [GROUP: ${desc}]`);
          continue;
        }

        // Rows with NO item number, NO qty, NO price = product mention (sub-item specification)
        // e.g. "ZyXEL GS2220-28HP 24-Port Switch" or "APC UPS 1KVA TOWER TYPE"
        if (!itemNo && !qty && !uprice && !sub && desc) {
          parts.push(`  PRODUCT MENTIONED: ${desc} (Section: ${currentSection})`);
          continue;
        }

        // It's a real priced line item
        const fields: string[] = [];
        if (itemNo) fields.push(`Item#: ${itemNo}`);
        if (desc)   fields.push(`Description: ${desc}`);
        if (qty)    fields.push(`QTY: ${qty}`);
        if (unit)   fields.push(`Unit: ${unit}`);
        if (uprice) fields.push(`Unit Price: ${uprice}`);
        if (sub)    fields.push(`Subtotal: ${sub}`);
        if (currentSection) fields.push(`(Section: ${currentSection})`);

        parts.push(`  LINE ITEM: ${fields.join(' | ')}`);
      }
    } else {
      // ── Fallback: smart output for Computation/summary sheets ──
      // Try to find Item No, Description, Unit, Qty, Cost columns
      let cDesc = -1, cQty = -1, cUnit = -1, cCost = -1, cTotal = -1, compHeader = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const r = rows[i].map((c: any) => String(c ?? '').toUpperCase().trim());
        const dIdx = r.findIndex((c: string) => c.includes('DESCRIPTION') || c === 'DESCRIPTION');
        const qIdx = r.findIndex((c: string) => c === 'QTY' || c === 'QUANTITY');
        if (dIdx !== -1 && qIdx !== -1) {
          compHeader = i;
          cDesc  = dIdx;
          cQty   = qIdx;
          cUnit  = r.findIndex((c: string) => c === 'UNIT' || c.includes('UNIT/S'));
          cCost  = r.findIndex((c: string) => c.includes('COST') && !c.includes('TOTAL'));
          cTotal = r.findIndex((c: string) => c.includes('TOTAL'));
          break;
        }
      }
      if (compHeader !== -1 && cDesc !== -1) {
        parts.push(`[Computation Sheet — structured extract]`);
        for (let i = compHeader + 1; i < rows.length; i++) {
          const row = rows[i];
          const desc  = cDesc >= 0 ? String(row[cDesc] ?? '').trim().replace(/\n/g,' ') : '';
          const qty   = cQty >= 0 ? String(row[cQty] ?? '').trim() : '';
          const unit  = cUnit >= 0 ? String(row[cUnit] ?? '').trim() : '';
          const cost  = cCost >= 0 ? String(row[cCost] ?? '').trim() : '';
          const total = cTotal >= 0 ? String(row[cTotal] ?? '').trim() : '';
          if (!desc) continue;
          const fields: string[] = [];
          if (desc)  fields.push(`Description: ${desc}`);
          if (qty)   fields.push(`QTY: ${qty}`);
          if (unit)  fields.push(`Unit: ${unit}`);
          if (cost)  fields.push(`Unit Cost: ${cost}`);
          if (total) fields.push(`Total: ${total}`);
          if (fields.length > 1) parts.push(`  COMP ITEM: ${fields.join(' | ')}`);
        }
      } else {
        parts.push('[Raw data sheet]');
        for (const row of rows) {
          const cells = row.filter((c: any) => c !== '' && c != null).map((c: any) => String(c).trim());
          if (cells.length > 0) parts.push(`  ${cells.join(' | ')}`);
        }
      }
    }
  }

  return parts.join('\n');
}



async function parseDOCX(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value;
}

async function parseText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = getExtension(file.name);
  const base: ParsedFile = {
    fileName: file.name,
    fileType: ext,
    content: '',
    size: file.size,
  };

  try {
    switch (ext) {
      case 'pdf':
        base.content = await parsePDF(file);
        break;
      case 'xlsx':
      case 'xls':
        base.content = await parseXLSX(file);
        break;
      case 'docx':
        base.content = await parseDOCX(file);
        break;
      case 'txt':
      case 'csv':
      case 'json':
      case 'xml':
      case 'md':
      case 'html':
      case 'htm':
        base.content = await parseText(file);
        break;
      default:
        if (file.type.startsWith('text/')) {
          base.content = await parseText(file);
        } else {
          base.content = `[Unsupported file type: .${ext}. Only PDF, XLSX, DOCX, TXT, CSV, JSON, and text files are supported.]`;
          base.error = `Unsupported file type: .${ext}`;
        }
    }
  } catch (err: any) {
    base.error = `${err.name || 'Error'}: ${err.message || 'Failed to parse file'}`;
    base.content = `[Error parsing file: ${base.error}]`;
  }

  return base;
}
