import pricelistRaw from '../data/pricelistData.json';

export interface PricelistItem {
  id: string;
  brand: string;
  type: string;
  model: string;
  price: number;
  contractorPrice: number;
  dealerPrice: number;
  endUserPrice: number;
  description: string;
  sourceFile: string;
}

export interface SearchOptions {
  brand?: string;
  category?: string;
  maxResults?: number;
  userType?: 'endUser' | 'contractor' | 'dealer' | 'srp';
}

export interface PricelistMatchResult {
  item: PricelistItem;
  score: number;
  matchType: 'exact_model' | 'partial_model' | 'alternative_category' | 'keyword';
}

export interface EstimatedItemPricing {
  itemQuery: string;
  foundInPricelist: boolean;
  isAlternative?: boolean;
  brand: string;
  model: string;
  description: string;
  price: number; // Base / SRP
  contractorPrice: number;
  dealerPrice: number;
  endUserPrice: number;
  effectivePrice: number; // Active price based on user tier
  source: string; // "Pricelist (File.csv)" or "Pricelist Recommended Alternative (File.csv)" or "Market Estimate (Not in Pricelist)"
  sourceFile?: string;
  rationale?: string;
  confidence: number; // 0 - 100
}

const catalog: PricelistItem[] = pricelistRaw as PricelistItem[];

const KNOWN_BRANDS = [
  'HIKVISION', 'BOSCH', 'AIPHONE', 'ZKTECO', 'DAHUA', 'HONEYWELL',
  'ASENWARE', 'APOLLO', 'EDWARDS', 'NOTIFIER', 'HOCHIKI', 'FARFISA',
  'AJAX', 'SIEMENS', 'SIMPLEX', 'TOA', 'AVTECH', 'EZVIZ', 'IMOU', 'ITC', 'RUIJIE', 'UNIQSCAN', 'GARRETT'
];

const STOP_WORDS = new Set([
  'can', 'you', 'tell', 'me', 'how', 'much', 'is', 'a', 'an', 'the', 'what',
  'where', 'for', 'of', 'to', 'in', 'on', 'at', 'by', 'please', 'give', 'find',
  'show', 'price', 'prices', 'cost', 'costs', 'estimate', 'estimation', 'rate',
  'rates', 'srp', 'dealer', 'contractor', 'enduser', 'item', 'device', 'equipment'
]);

const GENERIC_SPEC_WORDS = new Set([
  '1m', '2m', '3m', '4m', '5m', '6m', '10m', '15m', '20m', '50m', '100m',
  'length', 'width', 'height', 'size', 'pcs', 'pc', 'set', 'pack', 'unit',
  'meter', 'meters', 'mm', 'cm', 'kg', 'v', 'volt', 'amp', 'w', 'watt', 'mhz', 'ghz',
  'rec', 'alt', 'recommended', 'alternative'
]);

function normalizeKey(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Searches the catalog for products matching a query.
 */
export function searchPricelist(query: string, options: SearchOptions = {}): PricelistItem[] {
  if (!query || !query.trim()) {
    return catalog.slice(0, options.maxResults || 50);
  }

  const rawQuery = query.trim().toLowerCase();
  const rawTokens = rawQuery.split(/\s+/).filter(t => t.length > 1);
  const meaningfulTokens = rawTokens.filter(t => !STOP_WORDS.has(t));
  const tokensToUse = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

  const normQuery = normalizeKey(tokensToUse.join(' '));

  // Detect if user query mentions a specific brand
  const queryBrand = options.brand 
    ? options.brand 
    : KNOWN_BRANDS.find(b => rawQuery.includes(b.toLowerCase()));

  const scored = catalog.map(item => {
    let score = 0;
    const rawModel = (item.model || '').trim();
    const rawBrand = (item.brand || '').trim();
    const rawType = (item.type || '').trim();
    const rawDesc = (item.description || '').trim();

    const normModel = normalizeKey(rawModel);
    const normBrand = normalizeKey(rawBrand);
    const normType = normalizeKey(rawType);

    // If user query mentions a brand, heavily boost matching brand and penalize mismatched brand
    if (queryBrand) {
      const normQueryBrand = normalizeKey(queryBrand);
      if (normBrand.includes(normQueryBrand) || normQueryBrand.includes(normBrand)) {
        score += 2000;
      } else {
        score -= 2000;
      }
    }

    // 1. Exact normalized model match (Highest Priority)
    if (normModel.length > 1 && normQuery === normModel) {
      score += 1000;
    } else if (normModel.length > 2 && normQuery.includes(normModel)) {
      score += 500;
    } else if (normQuery.length > 2 && normModel.includes(normQuery)) {
      score += 400;
    }

    // 2. Exact raw model substring in query
    if (rawModel.length > 2 && rawQuery.includes(rawModel.toLowerCase())) {
      score += 300;
    }

    // 3. Token matching against model, brand, type, and description
    tokensToUse.forEach(token => {
      const normToken = normalizeKey(token);
      if (!normToken) return;

      const isGenericSpec = GENERIC_SPEC_WORDS.has(token.toLowerCase()) || GENERIC_SPEC_WORDS.has(normToken);
      const tokenWeightMultiplier = isGenericSpec ? 0.05 : 1.0;

      if (normModel === normToken) {
        score += 200 * tokenWeightMultiplier;
      } else if (normModel.includes(normToken)) {
        score += 80 * tokenWeightMultiplier;
      }

      if (normType.includes(normToken)) {
        score += 120 * tokenWeightMultiplier;
      }

      if (normBrand === normToken) {
        score += 50 * tokenWeightMultiplier;
      } else if (normBrand.includes(normToken)) {
        score += 20 * tokenWeightMultiplier;
      }

      if (rawDesc.toLowerCase().includes(token.toLowerCase())) {
        score += 25 * tokenWeightMultiplier;
      }
    });

    return { item, score };
  });

  const filtered = scored
    .filter(s => s.score > 15) // require meaningful minimum score threshold
    .sort((a, b) => b.score - a.score)
    .map(s => s.item);

  return filtered.slice(0, options.maxResults || 50);
}

/**
 * Finds the best single match in the pricelist folder catalog.
 */
export function findBestPricelistMatch(itemQuery: string): PricelistMatchResult | null {
  if (!itemQuery || !itemQuery.trim()) return null;
  const results = searchPricelist(itemQuery, { maxResults: 1 });
  if (results.length === 0) return null;

  const item = results[0];
  const normQuery = normalizeKey(itemQuery);
  const normModel = normalizeKey(item.model);

  let score = 0.5;
  let matchType: 'exact_model' | 'partial_model' | 'alternative_category' | 'keyword' = 'keyword';

  if (normModel && (normQuery === normModel || normQuery.includes(normModel))) {
    score = 1.0;
    matchType = 'exact_model';
  } else if (normModel.length > 2 && normModel.includes(normQuery)) {
    score = 0.85;
    matchType = 'partial_model';
  } else {
    score = 0.60;
  }

  return { item, score, matchType };
}

/**
 * Finds the Next Best Alternative item in our catalog when the specific TOR brand/model is not directly carried.
 */
export function findNextBestAlternative(itemQuery: string): PricelistItem | null {
  if (!itemQuery || !itemQuery.trim()) return null;

  const qLower = itemQuery.toLowerCase();
  
  // Strip out any non-carried brand name to search purely by category & features
  let searchCategory = itemQuery;
  KNOWN_BRANDS.forEach(b => {
    searchCategory = searchCategory.replace(new RegExp(b, 'gi'), '');
  });
  searchCategory = searchCategory.trim();

  if (!searchCategory) searchCategory = itemQuery;

  // Extract non-spec primary keywords from search query
  const primaryKeywords = searchCategory
    .toLowerCase()
    .split(/\s+/)
    .map(t => normalizeKey(t))
    .filter(t => t.length > 2 && !STOP_WORDS.has(t) && !GENERIC_SPEC_WORDS.has(t));

  // Search pricelist for equivalent items from AA2000 carried flagship brands
  const candidates = searchPricelist(searchCategory, { maxResults: 10 });
  
  // Filter candidates: candidate MUST match at least one primary keyword in model, type, or description
  const relevantCandidates = candidates.filter(c => {
    if (primaryKeywords.length === 0) return true;
    const itemStr = normalizeKey(`${c.brand} ${c.model} ${c.type} ${c.description}`);
    return primaryKeywords.some(pk => itemStr.includes(pk));
  });

  if (relevantCandidates.length > 0) {
    // Prefer carried flagship brands: Asenware, Hikvision, Dahua, ZKTeco, Bosch, Aiphone, Ruijie
    const preferredFlagship = relevantCandidates.find(c => {
      const b = c.brand.toUpperCase();
      return b.includes('ASENWARE') || b.includes('HIKVISION') || b.includes('DAHUA') || b.includes('ZKTECO') || b.includes('BOSCH') || b.includes('AIPHONE') || b.includes('RUIJIE');
    });

    return preferredFlagship || relevantCandidates[0];
  }

  return null;
}

/**
 * Gets product catalog stats for system prompts & UI reference
 */
export function getCatalogStats() {
  const totalProducts = catalog.length;
  const brands = Array.from(new Set(catalog.map(c => c.brand).filter(Boolean))).sort();
  const sourceFiles = Array.from(new Set(catalog.map(c => c.sourceFile).filter(Boolean))).sort();
  return { totalProducts, totalBrands: brands.length, brands, sourceFilesCount: sourceFiles.length };
}

/**
 * Gets the API key for Mistral AI
 */
function getMistralApiKey(): string {
  return import.meta.env.VITE_MISTRAL_API_KEY || localStorage.getItem('mistral_api_key') || '';
}

/**
 * Uses Mistral AI to verify whether a pricelist item (exact match or alternative) is genuinely
 * fit for the requested item — checking both product category AND description-level specs.
 * Returns true ONLY if the item is suitable for the requirement.
 */
async function verifyCandidateSuitability(
  requestedItem: string,
  candidate: PricelistItem,
  isExactMatch: boolean = false
): Promise<boolean> {
  const apiKey = getMistralApiKey();
  if (!apiKey) {
    // Without AI: check that meaningful keywords from request appear in type + model + description
    const typeNorm = normalizeKey(candidate.type || '');
    const modelNorm = normalizeKey(candidate.model || '');
    const descNorm = normalizeKey(candidate.description || '');
    const combinedNorm = `${typeNorm}${modelNorm}${descNorm}`;
    const keywords = requestedItem.toLowerCase().split(/\s+/)
      .map(t => normalizeKey(t))
      .filter(t => t.length > 3 && !STOP_WORDS.has(t) && !GENERIC_SPEC_WORDS.has(t));
    return keywords.length === 0 || keywords.some(k => combinedNorm.includes(k));
  }

  try {
    const matchLabel = isExactMatch ? 'EXACT PRICELIST MATCH' : 'PROPOSED ALTERNATIVE';
    const prompt = `You are a strict electronic security and safety systems product suitability verifier for a Philippine systems integrator.

REQUESTED ITEM: "${requestedItem}"
${matchLabel}:
  Brand: ${candidate.brand}
  Model: ${candidate.model}
  Type/Category: ${candidate.type}
  Description: "${candidate.description}"

Your job is to verify two things:
1. CATEGORY CHECK: Is this item in the same product category and serve the same function as the requested item?
2. DESCRIPTION/SPEC CHECK: Does the product description confirm this item is appropriate for the requested requirement?
   - Read the description carefully for clues: cable specs, camera type, detector type, interface, dimensions, etc.
   - If the description reveals it is clearly a DIFFERENT product type (e.g., thermal receipt printer description for a camera request, tyre killer description for a cable tray, etc.), mark as NOT suitable.
   - If the description is consistent with the requirement or cannot contradict it, mark as suitable.

Examples:
  - Request: "Cat6 UTP Cable" / Description: "CAT6 23AWG UTP cable, 305m roll" → suitable
  - Request: "Cat6 UTP Cable" / Description: "58mm Portable Thermal Receipt Printer, Bluetooth 4.0" → NOT suitable
  - Request: "2MP IP Dome Camera" / Description: "2MP Fixed Turret Network Camera, H.265+" → suitable
  - Request: "Smoke Detector" / Description: "Tyre Killer, Motor Drive, Spike thickness 12mm" → NOT suitable
  - Request: "Access Control Reader" / Description: "13.56MHz Mifare Card Reader, Wiegand output" → suitable

Respond ONLY with valid JSON: { "suitable": true } or { "suitable": false }
Do NOT include any explanation or extra text.`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.0,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) return false;

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const result = JSON.parse(content);
    return result.suitable === true;
  } catch {
    // On error, be permissive for exact matches and strict for alternatives
    return isExactMatch;
  }
}

/**
 * Core estimation pricing function that strictly satisfies the user rules:
 * 1. Pull exact equipment match from pricelist folder catalog first.
 * 2. If exact brand/model is not carried or unavailable in pricelist, verify and recommend a genuine
 *    functional equivalent from our catalog (AI suitability-checked). Do NOT recommend unrelated products.
 * 3. If no verified alternative exists, fallback to AI average market value estimation in PHP.
 */
export async function getEstimatedItemPricing(
  itemQuery: string,
  userTier: 'endUser' | 'contractor' | 'dealer' | 'srp' = 'contractor'
): Promise<EstimatedItemPricing> {
  // Step 1: Check Exact/Direct Pricelist Catalog Match
  const match = findBestPricelistMatch(itemQuery);

  if (match && match.score >= 0.8) {
    const item = match.item;

    // Description-level fitness check: even for exact matches, verify the description
    // confirms this item actually fits the requirement (catches e.g. model overlap across
    // completely unrelated product types in the catalog).
    const exactMatchFit = await verifyCandidateSuitability(itemQuery, item, true);
    if (exactMatchFit) {
      let effPrice = item.price;
      if (userTier === 'contractor') effPrice = item.contractorPrice || item.price;
      else if (userTier === 'dealer') effPrice = item.dealerPrice || item.price;
      else if (userTier === 'endUser') effPrice = item.endUserPrice || item.price;

      return {
        itemQuery,
        foundInPricelist: true,
        isAlternative: false,
        brand: item.brand,
        model: item.model || 'Pricelist Item',
        description: item.description,
        price: item.price,
        contractorPrice: item.contractorPrice || item.price,
        dealerPrice: item.dealerPrice || item.price,
        endUserPrice: item.endUserPrice || item.price,
        effectivePrice: effPrice,
        source: `Pricelist (${item.sourceFile})`,
        sourceFile: item.sourceFile,
        rationale: `Verified match found in official price list: ${item.sourceFile}`,
        confidence: Math.round(match.score * 100)
      };
    }
    // Description check failed — model matched but product type is wrong, fall through.
  }

  // Step 2: Exact item not in pricelist (or description check failed) ->
  // Search for NEXT BEST CARRIED ALTERNATIVE — verified against description AND category.
  const alternative = findNextBestAlternative(itemQuery);
  if (alternative) {
    const isSuitable = await verifyCandidateSuitability(itemQuery, alternative, false);
    if (isSuitable) {
      let effPrice = alternative.price;
      if (userTier === 'contractor') effPrice = alternative.contractorPrice || alternative.price;
      else if (userTier === 'dealer') effPrice = alternative.dealerPrice || alternative.price;
      else if (userTier === 'endUser') effPrice = alternative.endUserPrice || alternative.price;

      return {
        itemQuery,
        foundInPricelist: true,
        isAlternative: true,
        brand: alternative.brand,
        model: alternative.model,
        description: alternative.description,
        price: alternative.price,
        contractorPrice: alternative.contractorPrice || alternative.price,
        dealerPrice: alternative.dealerPrice || alternative.price,
        endUserPrice: alternative.endUserPrice || alternative.price,
        effectivePrice: effPrice,
        source: `Pricelist Alternative (${alternative.sourceFile})`,
        sourceFile: alternative.sourceFile,
        rationale: `TOR requested "${itemQuery}" is not directly carried. AA2000's verified carried equivalent: ${alternative.brand} ${alternative.model} (${alternative.sourceFile}).`,
        confidence: 85
      };
    }
    // Candidate failed suitability check — do NOT recommend a wrong-category product.
    // Fall through to Step 3: market value estimation.
  }

  // Step 3: NOT in Pricelist OR alternative failed suitability check
  // -> Estimate average market value in PHP using AI, do NOT guess a random catalog product.
  const apiKey = getMistralApiKey();
  if (!apiKey) {
    // Fallback if no AI key available
    return {
      itemQuery,
      foundInPricelist: false,
      isAlternative: false,
      brand: 'Generic / Custom',
      model: itemQuery,
      description: `Equipment/Device "${itemQuery}" (Not in official pricelist)`,
      price: 2500,
      contractorPrice: 2200,
      dealerPrice: 2000,
      endUserPrice: 2800,
      effectivePrice: 2200,
      source: 'Market Value Estimate (Not in Pricelist)',
      rationale: 'Item is not listed in the AA2000 pricelist folder. Estimated average market value.',
      confidence: 65
    };
  }

  try {
    const prompt = `You are an expert Electronic Security System Estimator in the Philippines.
The user requested pricing for the following equipment/device requested in a TOR/Specification: "${itemQuery}".
This item is NOT in the official local pricelist folder.

Estimate a realistic, current average Philippine Market Price in PHP (Philippine Pesos ₱) for this specific item.
Provide estimated prices for:
- SRP (Suggested Retail Price)
- Contractor Price (typically 10-15% below SRP)
- Dealer Price (typically 20-25% below SRP)
- End-User Price (typically equal to SRP or slightly above)

Respond in JSON strictly with this schema:
{
  "brand": "Estimated or standard manufacturer brand",
  "model": "Model number or clear product identifier",
  "description": "Brief technical description of item",
  "srpPrice": 5000,
  "contractorPrice": 4250,
  "dealerPrice": 3750,
  "endUserPrice": 5000,
  "marketRationale": "Detailed technical and market price rationale based on PH security market averages"
}`;

    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      throw new Error(`AI price estimation error: ${response.statusText}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content || '{}';
    const resData = JSON.parse(content);

    const srp = resData.srpPrice || 2500;
    const contractor = resData.contractorPrice || Math.round(srp * 0.85);
    const dealer = resData.dealerPrice || Math.round(srp * 0.78);
    const endUser = resData.endUserPrice || srp;

    let effPrice = srp;
    if (userTier === 'contractor') effPrice = contractor;
    else if (userTier === 'dealer') effPrice = dealer;
    else if (userTier === 'endUser') effPrice = endUser;

    return {
      itemQuery,
      foundInPricelist: false,
      isAlternative: false,
      brand: resData.brand || 'Market Standard',
      model: resData.model || itemQuery,
      description: resData.description || `TOR Requested Equipment: ${itemQuery}`,
      price: srp,
      contractorPrice: contractor,
      dealerPrice: dealer,
      endUserPrice: endUser,
      effectivePrice: effPrice,
      source: 'Market Value Estimate (Not in Pricelist)',
      rationale: resData.marketRationale || `Item requested in TOR was not in pricelist folder. Price estimated based on current PH market averages.`,
      confidence: 75
    };
  } catch (err: any) {
    console.error('Market estimation AI call failed:', err);
    return {
      itemQuery,
      foundInPricelist: false,
      isAlternative: false,
      brand: 'Generic',
      model: itemQuery,
      description: `Equipment: ${itemQuery}`,
      price: 3000,
      contractorPrice: 2550,
      dealerPrice: 2300,
      endUserPrice: 3000,
      effectivePrice: 2550,
      source: 'Market Value Estimate (Not in Pricelist)',
      rationale: 'Item not in pricelist folder. Default market fallback applied.',
      confidence: 50
    };
  }
}
