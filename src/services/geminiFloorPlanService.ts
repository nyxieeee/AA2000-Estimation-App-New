// Groq Vision API service for floor plan security estimation
// Uses qwen/qwen3.6-27b — ultra-fast, free tier at console.groq.com
// Note: Groq vision supports JPEG, PNG, GIF, WEBP. PDFs are handled as text-only context.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_VISION_MODEL = 'qwen/qwen3.6-27b';

// API key loaded from .env (VITE_GROQ_API_KEY)
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY as string;

export const GEMINI_KEY_STORAGE = 'aa2000_groq_key'; // localStorage override key

export interface FloorPlanEstimation {
  observations: string;
  manpower: {
    role: string;
    headcount: number;
    hours: number;
    manDays: number;
  }[];
  consumables: {
    name: string;
    category: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
  }[];
  fees: {
    type: string;
    amount: number;
    description: string;
  }[];
  constraints: {
    physical: string;
    electrical: string;
    installation: string;
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getMimeType(file: File): string {
  if (file.type && file.type !== '') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function isImageFile(file: File): boolean {
  const mime = getMimeType(file);
  return mime.startsWith('image/');
}

// Per-system equipment rules injected into the AI prompt
const SYSTEM_RULES: Record<string, { label: string; rules: string; exampleItems: string }> = {
  CCTV: {
    label: 'CCTV System',
    rules: `- IP Dome Camera: 1 per 80–100 sqm or per room/corridor entry point
- IP Bullet Camera: use for outdoor perimeter, parking lots, building exterior
- PTZ Camera: 1 per large open area (lobby, atrium, warehouse floor > 500sqm)
- PoE Network Switch (8/16/24-port): 1 per 8–16 cameras
- NVR (Network Video Recorder): size based on camera count (8ch, 16ch, 32ch)
- Hard Disk Drive (HDD): calculate for 30-day retention at 1080p (≈1TB per 4 cameras)
- Cat6 UTP Cable: estimate total cable meters (avg 40–60m per camera + 10% slack); output unit as "meters"
- RJ45 Connectors: 2 per camera run
- Cable Tray / J-Hook: estimate in meters along ceiling runs
- Wall Mount Bracket / Dome Mount: 1 per camera
- UPS (Uninterruptible Power Supply): 1 per NVR rack`,
    exampleItems: `{ "name": "IP Dome Camera 2MP Full HD", "category": "Hardware", "quantity": 12, "unit": "pcs", "unitPrice": 0 },
    { "name": "NVR 16-Channel", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "PoE Switch 16-Port", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "HDD 4TB Surveillance Grade", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 480, "unit": "meters", "unitPrice": 0 },
    { "name": "RJ45 Connector", "category": "Mounting Hardware", "quantity": 50, "unit": "pcs", "unitPrice": 0 }`,
  },
  FDAS: {
    label: 'FDAS / Fire Alarm System',
    rules: `- Smoke Detector (Photo-electric): 1 per 60 sqm ceiling area or per room
- Heat Detector: use in kitchens, parking, mechanical rooms (not smoke-sensitive zones)
- Manual Call Point (Break Glass / Pull Station): 1 per floor exit, max 30m spacing
- Fire Alarm Control Panel (FACP): size based on zone count (4-zone, 8-zone, 16-zone)
- Sounder / Alarm Bell: 1 per zone, spaced for 65dB coverage
- Strobe Light: 1 per zone for hearing-impaired compliance
- End-of-Line Resistor: 1 per zone circuit
- Fire Alarm Cable (2-core sheathed): estimate in meters — avg 25–40m per detector + 10% slack; unit "meters"
- Battery Backup (12V, 7Ah/17Ah): per FACP spec (typically 2 per panel)`,
    exampleItems: `{ "name": "Photoelectric Smoke Detector", "category": "Hardware", "quantity": 24, "unit": "pcs", "unitPrice": 0 },
    { "name": "Heat Detector", "category": "Hardware", "quantity": 6, "unit": "pcs", "unitPrice": 0 },
    { "name": "Manual Call Point", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "FACP 8-Zone Fire Alarm Control Panel", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Bell / Sounder", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fire Alarm Cable 2-Core", "category": "Wires & Cables", "quantity": 350, "unit": "meters", "unitPrice": 0 }`,
  },
  ACCESS_CONTROL: {
    label: 'Access Control System',
    rules: `- Card Reader (Proximity / RFID): 1 per secured door (in + out = 2 if bidirectional)
- Electromagnetic Lock (Mag-lock): 1 per door controlled
- Access Control Controller / Panel: 1 per 2–4 doors (check capacity)
- Door Exit Button (REX): 1 per door inner side
- Door Sensor (Magnetic): 1 per controlled door
- Power Supply (12VDC / 24VDC): 1 per 2–4 locks
- Network Cable Cat6: estimate in meters for controller runs
- Electric Strike: alternative to mag-lock for outswing doors
- Biometric Reader: upgrade option for high-security zones
- UPS / Battery Backup: 1 per controller`,
    exampleItems: `{ "name": "Proximity Card Reader", "category": "Hardware", "quantity": 8, "unit": "pcs", "unitPrice": 0 },
    { "name": "Electromagnetic Lock 600lbs", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Access Controller 4-Door", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Exit Button / REX", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 200, "unit": "meters", "unitPrice": 0 }`,
  },
  BURGLAR_ALARM: {
    label: 'Burglar Alarm System',
    rules: `- PIR Motion Detector: 1 per room / zone (covers 90° x 12m)
- Door/Window Contact Sensor: 1 per opening (door or window)
- Glass Break Detector: 1 per room with large glass panels
- Alarm Control Panel (DSC / Paradox / Hikvision): size based on zone count (8-zone, 16-zone, 32-zone)
- Outdoor Siren / Strobe: 1 per building face (front and rear minimum)
- Indoor Siren: 1 per floor
- Keypad: 1 per entry/exit zone
- Alarm Cable (4-core): estimate in meters — avg 20–30m per detector; unit "meters"
- SIM Card Communicator / GSM Module: 1 per panel for remote alerts`,
    exampleItems: `{ "name": "PIR Motion Detector", "category": "Hardware", "quantity": 12, "unit": "pcs", "unitPrice": 0 },
    { "name": "Door Contact Sensor", "category": "Hardware", "quantity": 8, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Control Panel 16-Zone", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Outdoor Siren with Strobe", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Alarm Cable 4-Core", "category": "Wires & Cables", "quantity": 220, "unit": "meters", "unitPrice": 0 }`,
  },
  DOOR_LOCK: {
    label: 'Door Lock System',
    rules: `- Hotel Door Lock / Smart Lock: 1 per guest room / private office door
- Lock Accessory (Magnetic cards, keyfobs): estimate based on expected users
- Smart Hotel Solution Software / Controller: 1 per reception/desk setup`,
    exampleItems: `{ "name": "Smart Hotel RFID Lock", "category": "Hardware", "quantity": 50, "unit": "pcs", "unitPrice": 0 },
    { "name": "Proximity RFID Guest Card", "category": "Hardware", "quantity": 200, "unit": "pcs", "unitPrice": 0 },
    { "name": "Smart Lock Controller Center", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 }`,
  },
  EAS_SYSTEM: {
    label: 'EAS System',
    rules: `- EAS Gate Antenna (Anti-theft): 1 pair per main retail exit point
- EAS Hard Tags / Soft Labels: estimate based on retail inventory count (packs of 1000)
- EAS Tag Detacher / Deactivator: 1 per cash register / POS station`,
    exampleItems: `{ "name": "EAS Anti-Theft Gate Antenna", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "EAS Hard Tag 58Khz (1000pcs/box)", "category": "Hardware", "quantity": 5, "unit": "pcs", "unitPrice": 0 },
    { "name": "EAS Magnetic Tag Detacher", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  FIRE_PROTECTION: {
    label: 'Fire Protection / Suppression System',
    rules: `- Sprinkler Head (Pendant / Upright): 1 per 9–12 sqm ceiling area
- Sprinkler Pipe (Schedule 40 Black Steel): estimate in meters along ceiling grid; unit "meters"
- Fire Suppression Cylinder (FM200 / CO2 / Novec): for server rooms — 1 per protected zone
- Fire Hose Cabinet (Reel or Box): 1 per 25–30m radius coverage
- Siamese Connection: 1 per building exterior (BFP requirement)
- Pressure Gauge / Flow Switch: 1 per riser/zone`,
    exampleItems: `{ "name": "Sprinkler Head Pendant Type", "category": "Hardware", "quantity": 40, "unit": "pcs", "unitPrice": 0 },
    { "name": "Schedule 40 Black Steel Pipe 1-inch", "category": "Protective Coverings", "quantity": 120, "unit": "meters", "unitPrice": 0 },
    { "name": "FM200 Suppression Cylinder 30kg", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fire Hose Cabinet with Reel", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
  FIXED_ARM_ELEVATOR: {
    label: 'Fixed Arm & Elevator Related System',
    rules: `- Elevator Access Controller: 1 per lift cabin/shaft (supports multi-floor control)
- Fixed Arm Bracket/Support: 1 per turnstile/barrier gate installation
- Elevator RFID Reader / Biometric Scanner: 1 per lift cabin`,
    exampleItems: `{ "name": "Elevator Control Panel 20-Floor", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Fixed Arm Mounting Pole", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Elevator Card Reader", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  INTERCOM_NURSE_CALL: {
    label: 'Intercom & Nurse Call System',
    rules: `- Video Intercom Door Station: 1 per building entry or lobby door
- Video Intercom Room Master Station: 1 per counter / security desk
- Nurse Call Master Panel: 1 per nurse station (sized for bed count)
- Patient Bed Station (with pull cord/button): 1 per hospital/clinic bed
- Hallway Dome Light: 1 per patient room entrance`,
    exampleItems: `{ "name": "Nurse Call Master Station 24-ch", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Patient Bed Call Button Station", "category": "Hardware", "quantity": 16, "unit": "pcs", "unitPrice": 0 },
    { "name": "Intercom Door Station", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Intercom Indoor Monitor 7-inch", "category": "Hardware", "quantity": 6, "unit": "pcs", "unitPrice": 0 }`,
  },
  PABX_PAGING: {
    label: 'PABX & Paging System',
    rules: `- PABX Central Control Box / IP-PBX: 1 per main wiring hub
- Paging Power Amplifier (120W/240W/350W): 1 per paging setup or zone
- Ceiling Speakers: 1 per 35-40 sqm ceiling space
- Wall / Column Speakers: 1 per corridor or warehouse zone
- Paging Microphone Console: 1 per reception/announcement area`,
    exampleItems: `{ "name": "PABX 8-Line 32-Extension Control Box", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Paging Amplifier 240W", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "PA Ceiling Speaker 6W", "category": "Hardware", "quantity": 30, "unit": "pcs", "unitPrice": 0 },
    { "name": "Paging Desktop Microphone Console", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 }`,
  },
  PARKING_BARRIER: {
    label: 'Parking Barrier System',
    rules: `- Barrier Gate Boom: 1 per parking entry or exit lane
- Parking Barrier Controller: 1 per lane checkpoint
- Vehicle Loop Detector: 2 per barrier gate (safety loop + trigger loop)
- UHF Long-Range RFID Reader: 1 per entry/exit lane for hands-free vehicle access
- Loop Detector Wire: estimate in meters (typically 15-20 meters per loop)`,
    exampleItems: `{ "name": "Automatic Parking Barrier Gate with 4m Boom", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "UHF RFID Long Range Reader", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Vehicle Loop Detector Module", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Loop Detector Wire", "category": "Wires & Cables", "quantity": 80, "unit": "meters", "unitPrice": 0 }`,
  },
  POS_SYSTEM: {
    label: 'POS System',
    rules: `- POS Terminal / POS Computer: 1 per cashier counter
- POS Thermal Receipt Printer: 1 per POS terminal
- Cash Drawer (Heavy duty): 1 per POS terminal
- Barcode Scanner (Handheld or Omni-directional): 1 per POS terminal`,
    exampleItems: `{ "name": "All-in-One Touchscreen POS Terminal", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Thermal Receipt Printer 80mm", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Heavy Duty Cash Drawer", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "USB Laser Barcode Scanner", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
  ROOM_ALERT: {
    label: 'Room Alert System',
    rules: `- Room Alert Environment Monitor Unit: 1 per server room, data center, or telecom closet
- External Temperature/Humidity Sensor: 1–2 per server rack
- Water Flood Sensor: 1 per sub-floor or air-con unit location
- Dry Contact Smoke Sensor (Room Alert compliant): 1 per critical enclosure`,
    exampleItems: `{ "name": "Room Alert Environment Monitor Main Unit", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
    { "name": "Digital Temperature and Humidity Sensor", "category": "Hardware", "quantity": 4, "unit": "pcs", "unitPrice": 0 },
    { "name": "Flood Sensor Cable 10ft", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 }`,
  },
  XRAY_SECURITY: {
    label: 'X-Ray, Turnstile & Security Inspection System',
    rules: `- X-Ray Baggage Scanner: 1 per main building lobby entrance checkpoint
- Walk-Through Metal Detector (WTMD): 1 per entrance checkpoint lane
- Hand-Held Metal Detector: 1–2 per security guard station
- Tripod Turnstile or Flap Barrier: 1 per entrance lane (e.g. 3 lanes = 3 barriers)
- Turnstile Access Control Integration Board: 1 per turnstile setup`,
    exampleItems: `{ "name": "X-Ray Baggage Scanner Machine", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Walk-Through Metal Detector 33-Zone", "category": "Hardware", "quantity": 1, "unit": "pcs", "unitPrice": 0 },
    { "name": "Hand-Held Security Metal Detector Wand", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 },
    { "name": "Tripod Turnstile Gate", "category": "Hardware", "quantity": 3, "unit": "pcs", "unitPrice": 0 }`,
  },
};

function buildPrompt(
  surveyType: string,
  info: { buildingType?: string; floors?: number; location?: string; projectName?: string; surveyScope?: string },
  imageCount: number,
  pdfCount: number
): string {
  const parts: string[] = [];
  if (imageCount > 0) parts.push(`${imageCount} floor plan image${imageCount > 1 ? 's' : ''}`);
  if (pdfCount > 0) parts.push(`${pdfCount} PDF document${pdfCount > 1 ? 's' : ''} (described by filename only)`);
  const fileDesc = parts.join(' and ');

  // Parse the surveyType field — may be comma-separated list like "CCTV,FDAS,ACCESS_CONTROL"
  const systemKeys = surveyType.split(',').map(s => s.trim().toUpperCase());
  const systems = systemKeys.filter(k => SYSTEM_RULES[k]);
  const unknownSystems = systemKeys.filter(k => !SYSTEM_RULES[k]);

  // Build system-specific rules block
  let systemRulesBlock = '';
  if (systems.length > 0) {
    systemRulesBlock = systems.map(key => {
      const s = SYSTEM_RULES[key];
      return `\n## ${s.label}\n${s.rules}`;
    }).join('\n');
  } else {
    // Fallback for unknown/OTHER
    systemRulesBlock = `\n## General Security Systems\n- Estimate equipment appropriate for the building type and floor plan\n- Include cabling in meters where applicable`;
  }

  // Build example consumables from all selected systems
  const exampleConsumables = systems.map(key => SYSTEM_RULES[key].exampleItems).join(',\n    ');
  const systemLabel = systems.length > 0
    ? systems.map(k => SYSTEM_RULES[k].label).join(' + ')
    : (unknownSystems[0] || 'Security System');

  return `You are an expert electronic security and fire safety systems estimator working in the Philippines.

Analyze ${fileDesc} and generate a detailed technical bill-of-quantities (BOQ) for the following system installation:
**${systemLabel}**

Project context:
- Building type: ${info.buildingType || 'Office'}
- Number of floors: ${info.floors || 1}
- Location: ${info.location || 'Metro Manila, Philippines'}
- Project name: ${info.projectName || 'Security Installation'}${info.surveyScope ? `\n- Scope notes: ${info.surveyScope}` : ''}

=== SYSTEM-SPECIFIC EQUIPMENT RULES ===
Apply ONLY the rules for the systems listed below. Do NOT include equipment from other systems not listed.
${systemRulesBlock}

=== MANPOWER RULES ===
- Always include: Lead Security Engineer (1 person, supervises the whole job)
- Always include: Safety Officer (1 person, DOLE compliance)
- Add system installers based on scope: ~4–6 CCTV cameras/day, ~100m cable/day, ~8–10 detectors/day, ~4 access doors/day
- man-days = ceil(headcount × hours / 8)

IMPORTANT: Return ONLY a single valid JSON object. No markdown, no explanation. Just raw JSON.

{
  "observations": "Describe what you see in the floor plan: room count, estimated total area sqm, key zones (lobby, server room, parking, corridors, etc.), and which areas need coverage for each system.",
  "manpower": [
    { "role": "Lead Security Engineer", "headcount": 1, "hours": 32, "manDays": 4 },
    { "role": "Systems Installer", "headcount": 2, "hours": 48, "manDays": 12 }
  ],
  "consumables": [
    ${exampleConsumables || `{ "name": "Cat6 UTP Cable", "category": "Wires & Cables", "quantity": 200, "unit": "meters", "unitPrice": 0 }`}
  ],
  "fees": [
    { "type": "Travel Fee", "amount": 0, "description": "Mobilization to site" }
  ],
  "constraints": {
    "physical": "Wall types, ceiling height, physical obstacles from floor plan",
    "electrical": "Power supply needs, UPS, DB room location",
    "installation": "Access timing, night shift considerations, tenant restrictions"
  }
}`;
}

export async function analyzeFloorPlan(
  imageFiles: File[],
  surveyType: string,
  buildingInfo: {
    buildingType?: string;
    floors?: number;
    location?: string;
    projectName?: string;
    surveyScope?: string;
  }
): Promise<FloorPlanEstimation> {
  const apiKey = GROQ_API_KEY || localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!apiKey.trim() || apiKey === 'your_groq_api_key_here') {
    throw new Error(
      'Groq API key not configured. Please set VITE_GROQ_API_KEY in the .env file and restart the dev server. Get a free key at console.groq.com'
    );
  }
  if (!imageFiles.length) {
    throw new Error('No floor plan files provided.');
  }

  // Separate images (can be sent visually) from PDFs (text-only context)
  const images = imageFiles.filter(isImageFile);
  const pdfs = imageFiles.filter(f => !isImageFile(f));

  // Build content array — image parts first, then text prompt
  const contentParts: object[] = [];

  // Convert image files to base64 and add as image_url parts
  for (const img of images) {
    const base64 = await fileToBase64(img);
    const mime = getMimeType(img);
    contentParts.push({
      type: 'image_url',
      image_url: {
        url: `data:${mime};base64,${base64}`,
      },
    });
  }

  // Add PDF file names as context in the prompt
  const prompt = buildPrompt(surveyType, buildingInfo, images.length, pdfs.length);

  let finalPrompt = prompt;
  if (pdfs.length > 0) {
    finalPrompt += `\n\nPDF files provided (visual content not available, use filename as context):\n${pdfs.map(f => `- ${f.name}`).join('\n')}`;
  }

  contentParts.push({ type: 'text', text: finalPrompt });

  const requestBody = {
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: 'user',
        content: contentParts,
      },
    ],
    temperature: 0.2,
    max_tokens: 4096,
    reasoning_format: 'hidden',
    reasoning_effort: 'none',
  };

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errMsg = `Groq API error (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData?.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const rawText: string | undefined = data?.choices?.[0]?.message?.content;

  if (!rawText) {
    throw new Error('Groq returned an empty response. Try again.');
  }

  // Strip markdown fences if model wrapped the JSON
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  // Extract JSON object if there's surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      'Could not extract JSON from Groq response. The floor plan may be unclear — try a higher resolution image.'
    );
  }

  try {
    return JSON.parse(jsonMatch[0]) as FloorPlanEstimation;
  } catch {
    throw new Error(
      'Could not parse Groq response. Try again or use a clearer floor plan image.'
    );
  }
}

export async function testGeminiConnection(apiKey?: string): Promise<string> {
  const key = apiKey || GROQ_API_KEY || localStorage.getItem(GEMINI_KEY_STORAGE) || '';
  if (!key.trim() || key === 'your_groq_api_key_here') {
    throw new Error('No Groq API key set.');
  }
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.trim()}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Reply with just: OK' }],
      max_tokens: 10,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } })?.error?.message || `HTTP ${response.status}`);
  }
  const data = await response.json() as { choices?: { message?: { content?: string } }[] };
  return data?.choices?.[0]?.message?.content || 'OK';
}
