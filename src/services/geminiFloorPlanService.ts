// Floor plan estimation service
// Phase 1 Vision: Mistral Pixtral (vision) — reads floor plan images
// Phase 2 BOQ:    Mistral Large — generates accurate quantities
// All calls go directly to the Mistral API using VITE_MISTRAL_API_KEY.

import { parseFile } from './fileParser';
import { getEstimatedItemPricing } from './pricelistService';

// Vision model — Pixtral supports multi-image input
const MISTRAL_VISION_MODEL = 'pixtral-12b-2409';
// BOQ reasoning model
const MISTRAL_REASONING_MODEL = 'mistral-large-latest';

export interface FloorPlanEstimation {
  observations: string;
  confidenceScore: number;
  quotationReferenceCode?: string;
  quotationHeader?: {
    attentionTo: string;
    thru: string;
    emailAdd: string;
    contactNo: string;
    company: string;
    address: string;
    projectSite: string;
    projectTitle: string;
    quoteDate: string;
    validityPeriod: string;
  };
  deviceSummary?: {
    facpBrand: string;
    systemType: string;
    totalUnitsText: string;
    buildingProfile: string;
    workingSchedule: string;
    remarks: string;
  };
  generalRequirements?: {
    itemNumber: number;
    description: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  scopeOfWorks?: {
    itemNumber: number;
    description: string;
    unit: string;
    qty?: number;
    unitPrice?: number;
    totalPrice: number;
  }[];
  costBreakdown?: {
    itemATotal: number;
    itemBTotal: number;
    subTotal: number;
    discount: number;
    subTotalWithDiscount: number;
    vat12Percent: number;
    grandTotalAmount: number;
  };
  scheduleOfPayment?: {
    itemCode: string;
    milestone: string;
    qty: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  termsAndConditions?: string[];
  manpower: {
    role: string;
    headcount: number;
    hours: number;
    manDays: number;
    ratePerDay?: number;
    totalCost?: number;
  }[];
  consumables: {
    name: string;
    category: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    srp?: number;
    contractorPrice?: number;
    dealerPrice?: number;
    totalPrice?: number;
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

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };
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
- PTZ Camera: 1 per large open area (lobby, atrium, warehouse floor >500sqm)
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
    { "name": "Battery Backup 12V 7Ah", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
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
    { "name": "UPS / Battery Backup 12VDC", "category": "Hardware", "quantity": 2, "unit": "pcs", "unitPrice": 0 },
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

// ─── STEP 1 PROMPT: Floor Plan Visual Analysis ───────────────────────────────
function buildAnalysisPrompt(
  surveyType: string,
  info: { buildingType?: string; floors?: number; location?: string; projectName?: string; surveyScope?: string; torContent?: string },
): string {
  const systemKeys = surveyType.split(',').map(s => s.trim().toUpperCase());
  const systems = systemKeys.filter(k => SYSTEM_RULES[k]);
  const systemLabel = systems.length > 0
    ? systems.map(k => SYSTEM_RULES[k].label).join(', ')
    : 'General Security System';

  let torBlock = '';
  if (info.torContent && info.torContent.trim().length > 0) {
    torBlock = `\n- TERMS OF REFERENCE (TOR) SPECIFICATIONS:\n${info.torContent}\n\n[MANDATORY INSTRUCTION] Adjust your analysis parameters to respect the requirements, camera resolutions, brands, and device counts mentioned in the TOR above.`;
  }

  return `You are an expert security and fire systems estimator reviewing architectural floor plans and/or technical specification Terms of Reference (TOR) documents for a ${systemLabel} installation in the Philippines.

PROJECT DETAILS:
- Building type: ${info.buildingType || 'Office'}
- Floors shown: ${info.floors || 1}
- Location: ${info.location || 'Metro Manila, Philippines'}
- Project: ${info.projectName || 'Security Installation'}${info.surveyScope ? `\n- Scope: ${info.surveyScope}` : ''}${torBlock}

TASK:
1. Carefully analyze the uploaded floor plan image(s) and/or PDF document(s).
2. === CRITICAL LEGEND & SYMBOL KEY DIRECTIVE ===
   - Proactively search all uploaded pages/sheets for any section titled "LEGEND", "SYMBOL KEY", "DEVICE SCHEDULE", or containing device symbol icon definitions.
   - If a LEGEND is present (e.g. Manual Call Point, CCTV Camera, DVR, UPS, Fire Exit Signage, Smoke Detector, Emergency Light, Fire Extinguisher, Walkthrough Metal Detector, Card Reader, EM Lock, Exit Button, Break Glass, Key Switch, Door Contact, Motion Sensor, Panic Button, Strobe/Sounder, Alarm Panels):
     * Extract ALL device definitions listed in the Legend.
     * Count each symbol drawn on the floor plan drawing using the exact Legend definitions without adding unwarranted extra hardware.
     * Explicitly state in the "observations" field: "LEGEND DETECTED: Extracted symbol definitions from Floor Plan Legend Sheet."
3. === CRITICAL PLOTTED SECURITY EQUIPMENT PLAN DIRECTIVE ===
   - If the uploaded images/PDFs are "Security Equipment Plans" (plotted drawings showing icons mounted on walls, doors, ceilings, or desks, e.g. "FDAS Plan", "Access Control Plan", "IDS Plan", "CCTV Plan"):
     * Count EVERY individual icon plotted on the architectural layout per system.
     * FDAS Sheet: Count Manual Call Points (red bell), Smoke Detectors (discs), Heat Detectors, Emergency Lights (twin heads), Fire Extinguishers, Sprinkler Cylinders, Fire Exit Signage, Strobe Light & Sounders.
     * Access Control Sheet: Count Card Readers mounted at doors, Electromagnetic Locks (EM Locks), Push to Exit Buttons, Emergency Break Glass units, Key Switches, EE Room controllers.
     * IDS / Intrusion Sheet: Count Panic Buttons at desks/workstations, Motion Sensors (PIR), Strobe Light & Sounders for IDS (blue strobe), Door Contacts on exterior doors/windows, Honeywell/AJAX IDS Alarm Panels & Keypads.
     * CCTV Sheet: Count Dome cameras in rooms/hallways, Bullet cameras at exits, NVR / Rack units in EE Room/Server Room.
     * Multi-Sheet Sets: Aggregate device counts across ALL pages without double-counting identical sheets.
     * In the "observations" field, explicitly note: "PLOTTED EQUIPMENT PLAN DETECTED: Analyzed plotted icon positions across FDAS, Access Control, IDS, and CCTV sheets."

Respond in this EXACT JSON format (no markdown, no explanation):
{
  "floorCount": <number of floors visible or specified in the plans/TOR>,
  "estimatedTotalAreaSqm": <total built-up area in square meters — estimate from scale or use specified value>,
  "rooms": {
    "offices": <count of offices/workstations or 0>,
    "conferenceRooms": <count of conference rooms or 0>,
    "serverRooms": <count of server/telecom rooms or 0>,
    "toilets": <count of toilet rooms or 0>,
    "lobbies": <count of lobbies or 0>,
    "corridors": <count of corridors or 0>,
    "stairwells": <count of stairwells or 0>,
    "elevatorShafts": <count of elevators or 0>,
    "parkingSlots": <count of parking slots or 0>,
    "warehouse": <count of warehouses or 0>,
    "kitchen": <count of kitchens or 0>,
    "other": <count of other rooms or 0>
  },
  "doors": {
    "mainEntrances": <count of entrance doors or 0>,
    "fireExitDoors": <count of fire exits or 0>,
    "securedDoors": <count of doors needing access control or 0>,
    "regularDoors": <count of other doors or 0>
  },
  "ceilingHeightMeters": <estimated ceiling height or 3.0>,
  "buildingPerimeterMeters": <perimeter in meters or 100>,
  "observations": "Provide a detailed summary (4-5 sentences) of the floor plan layout OR the exact specifications/brands/quantities/constraints extracted from the TOR document. If you read a TOR, list the exact list of hardware, cameras, NVRs, detectors, cables, and quantities you found in the document.",
  "extractedTorItems": [
    {
      "name": "Exact hardware/service name with brand/model if specified",
      "quantity": <exact number specified>,
      "category": "Hardware"
    }
  ]
}`;
}

// ─── STEP 2 PROMPT: BOQ Generation from analysis data ────────────────────────
function buildBoqPrompt(
  surveyType: string,
  info: {
    buildingType?: string;
    floors?: number;
    location?: string;
    projectName?: string;
    surveyScope?: string;
    torContent?: string;
    selectedBrand?: string;
    clientName?: string;
    clientContactName?: string;
    clientEmail?: string;
    clientPhone?: string;
    systemTypes?: string[];
  },
  analysis: Record<string, unknown>,
): string {
  const systemKeys = surveyType.split(',').map(s => s.trim().toUpperCase());
  const systems = systemKeys.filter(k => SYSTEM_RULES[k]);
  const isTorUploaded = !!(info.torContent && info.torContent.trim().length > 0);

  let systemRulesBlock = '';
  if (isTorUploaded) {
    systemRulesBlock = `\n[CRITICAL] A Terms of Reference (TOR) or technical specification document is uploaded. Ignore standard equipment calculation rules. Do NOT estimate or generate any items other than the exact hardware and quantities listed in the TOR.`;
  } else if (systems.length > 0) {
    systemRulesBlock = systems.map(key => {
      const s = SYSTEM_RULES[key];
      return `\n## ${s.label}\n${s.rules}`;
    }).join('\n');
  } else {
    systemRulesBlock = `\n## General Security Systems\n- Estimate equipment appropriate for the building type and floor plan\n- Include cabling in meters where applicable`;
  }

  const systemLabel = systems.length > 0
    ? systems.map(k => SYSTEM_RULES[k].label).join(' + ')
    : 'Security System';

  const rooms = analysis.rooms as Record<string, number> || {};
  const doors = analysis.doors as Record<string, number> || {};
  const totalRooms = Object.values(rooms).reduce((a, b) => a + (b || 0), 0);
  const totalAreaSqm = (analysis.estimatedTotalAreaSqm as number) || (totalRooms * 25);
  const perimeter = (analysis.buildingPerimeterMeters as number) || 100;
  const ceilingH = (analysis.ceilingHeightMeters as number) || 3.0;

  let torBlock = '';
  if (isTorUploaded) {
    torBlock = `\n\n=== TERMS OF REFERENCE (TOR) SPECIFICATIONS / REQUIREMENTS ===\n${info.torContent}\n\n[MANDATORY ESTIMATION COMPLIANCE] Your generated BOQ, manpower estimation, consumables, and cable lengths MUST strictly comply with the brands, model names, quantities, and roles specified in the TOR above. If the TOR says 2MP Dome Cameras, do NOT estimate 4MP. If the TOR specifies a particular NVR channel size, cabling type, or technician headcount, use exactly that.`;
  }

  let extractedTorItemsBlock = '';
  if (analysis.extractedTorItems && Array.isArray(analysis.extractedTorItems) && analysis.extractedTorItems.length > 0) {
    extractedTorItemsBlock = `\n\n=== EXACT HARDWARE & QUANTITIES EXTRACTED FROM TOR DOCUMENT ===\n${JSON.stringify(analysis.extractedTorItems, null, 2)}\n\n[CRITICAL DIRECTIVE] The items above were extracted directly from the uploaded Terms of Reference (TOR) or technical specifications document. Since a TOR is uploaded, you MUST include ONLY the items listed in the "extractedTorItems" block in the "consumables" array in the final JSON. DO NOT estimate or append any additional equipment, items, accessories, or consumables. The final BOQ consumables list MUST match the extracted TOR list 100% strictly.`;
  }

  let brandDirectiveBlock = '';
  if (info.selectedBrand && info.selectedBrand !== 'Generalized / Any Brand') {
    brandDirectiveBlock = `\n\n=== SELECTED BRAND DIRECTIVE ===\nThe user has explicitly selected the target brand "${info.selectedBrand}". Include "${info.selectedBrand}" in the item name and specifications for all active hardware components (e.g. "${info.selectedBrand} 5MP IP Dome Camera", "${info.selectedBrand} 16-Channel NVR").`;
  } else {
    brandDirectiveBlock = `\n\n=== BRAND DIRECTIVE ===\nUse generalized, brand-agnostic technical descriptions for all active items (e.g., "5MP IP Dome Camera", "16-Channel NVR", "Addressable Optical Smoke Detector", "Access Control Controller", "24-Port POE Switch"). DO NOT force or append any specific brand name unless an uploaded TOR explicitly requires it.`;
  }

  return `You are an expert electronic security and fire safety systems estimator for the Philippines.

You have already analyzed the floor plan and technical documents. Here are the EXACT counts and specifications extracted:

FLOOR PLAN/DOCUMENT ANALYSIS RESULTS:
- Total area: ~${totalAreaSqm} sqm across ${analysis.floorCount || info.floors || 1} floor(s)
- Offices: ${rooms.offices || 0}, Conference rooms: ${rooms.conferenceRooms || 0}, Server rooms: ${rooms.serverRooms || 0}
- Lobbies: ${rooms.lobbies || 0}, Corridors: ${rooms.corridors || 0}, Toilets: ${rooms.toilets || 0}
- Stairwells: ${rooms.stairwells || 0}, Elevators: ${rooms.elevatorShafts || 0}
- Parking slots: ${rooms.parkingSlots || 0}, Warehouse: ${rooms.warehouse || 0}, Kitchen: ${rooms.kitchen || 0}, Other: ${rooms.other || 0}
- Main entrances: ${doors.mainEntrances || 0}, Fire exits: ${doors.fireExitDoors || 0}
- Secured/restricted doors: ${doors.securedDoors || 0}, Regular doors: ${doors.regularDoors || 0}
- Building perimeter: ~${perimeter}m, Ceiling height: ~${ceilingH}m
- Observations: ${(analysis.observations as string) || 'N/A'}${extractedTorItemsBlock}

SYSTEM TO INSTALL: ${systemLabel}
Building: ${info.buildingType || 'Office'}, ${info.floors || 1} floor(s), ${info.location || 'Metro Manila'}${info.surveyScope ? `\nScope: ${info.surveyScope}` : ''}${torBlock}${brandDirectiveBlock}

=== ZERO UNWARRANTED RECOMMENDATION & SERVICE-SCOPE DIRECTIVE ===
- NEVER recommend, invent, or add items that are not explicitly requested.
- If the project, TOR, or survey scope is for SERVICES, LABOR, PREVENTIVE MAINTENANCE (PMS), AUDIT, REPAIR, REPLACEMENT, or RELOCATION:
  - Do NOT recommend or add new cameras, NVRs, detectors, or complete hardware kits!
  - The "consumables" array must ONLY contain the exact replacement items or hardware explicitly requested in the document/scope. If no hardware supply is requested, the "consumables" array must be EMPTY [].
  - Focus the estimation strictly on "manpower", "scopeOfWorks", and procedural service requirements.
- If a TOR or specification is provided, include ONLY the exact items and quantities written in the TOR. Do NOT extrapolate or add "recommended" accessories.

=== LEGEND & SYMBOL KEY RECOGNITION DIRECTIVE ===
If the uploaded floor plan contains a LEGEND, SYMBOL KEY, or SYMBOL TABLE (e.g., defining Manual Call Point, Smoke Detector, Emergency Light, Fire Extinguisher, Walkthrough Metal Detector, Card Reader, Electromagnetic Lock, Exit Button, Break Glass, Key Switch, Door Contact, Panic Button, Motion Sensor, Auto Dialer, Strobe/Sounder, Alarm Panel):
- Include ONLY the device categories plotted or defined in the drawing without adding unrequested extra equipment.

=== EQUIPMENT RULES — Apply ONLY if floor plan drawings show new installation areas without a restrictive TOR/service scope ===
${systemRulesBlock}

=== AA2000 OFFICIAL CARRIED BRANDS & STRICT COMPATIBILITY RULES ===
- When a brand is selected, choose strictly from AA2000's carried brand catalog:
  - CCTV: Hikvision, Dahua Technology, AVTECH, Honeywell, Panasonic, AXIS Communications, Imou, EZVIZ, Matrix Telecom & Security
  - FDAS (Fire Alarm): Honeywell, EDWARDS, NOTIFIER (by Honeywell), Simplex, Asenware, Hochiki, Numens, Siemens, Eaton, Esser, Apollo, Cooper, Horing Lih, Gamewell-FCI, TYY
  - Access Control & Biometrics: ZKTeco, Anson, Honeywell, Hikvision, Matrix Telecom & Security, HID, Suprema, IDTECK, CEM Systems, Software House, EntryPass, OK Omnikey, EDGE
  - Burglar / Intrusion Alarm: Honeywell (Flagship Partner)
  - Networking & Connectivity: Ruijie Networks (Enterprise Networking Partner)
  - Metal Detectors & X-Ray Scanners: Uniqscan, Garrett, ZKTeco
- Enforce strict compatibility:
  - CCTV: NVR channel size must cover camera count. POE switches MUST match total camera power load.
  - FDAS: Fire alarm control panel and detectors MUST match the exact loop protocol. Never mix incompatible brands on the same SLC loop!
  - ACS: Access controller and card readers must match protocol (Wiegand/OSDP). Power supply amperage must cover total lock + reader current draw.

=== CABLE LENGTH CALCULATION ===
- Route cables from each device back to the nearest panel/NVR/controller
- Average horizontal run = half the floor width + vertical drop from ceiling
- Add 15% slack for bends, loops, and termination
- Use the building perimeter (${perimeter}m) and area (${totalAreaSqm} sqm) to calibrate distances

=== MANPOWER CALCULATION ===
- Lead Security Engineer: 1 person, full project duration
- Safety Officer: 1 person, DOLE compliance (full duration)
- System Installers: size based on scope — ~4–6 CCTV cameras per day, ~100m cable per day, ~8–10 detectors per day, ~4 access doors per day
- man-days = ceil(headcount × hours / 8)
- Working hours per day = 8

=== OFFICIAL AA2000 SUPER-DETAILED QUOTATION STRUCTURE DIRECTIVE ===
You MUST generate a complete, super-detailed AA2000 Commercial Sales Quotation and Engineering BOQ JSON structure containing:

IMPORTANT: All items below MUST be dynamically tailored to the detected system types (${systemLabel}), customer details (${info.clientName || 'Valued Client'}), project title (${info.projectName || `${systemLabel} Engineering & Installation Project`}), building scale (${info.floors || 1} floors), and detected equipment line items.
- If system is CCTV: Generate detailed procedural steps for camera optical lens cleaning, field of view calibration, NVR S.M.A.R.T. storage diagnostics, PoE switch testing, VMS latency optimization.
- If system is ACCESS CONTROL: Generate detailed procedural steps for biometric/RFID reader calibration, magnetic lock holding force tests, backup battery load testing, emergency egress fire trip tests.
- If system is FDAS: Generate detailed procedural steps for FACP diagnostics, detector chamber servicing, manual station inspection, smoke canister testing, FSMR certification.
- If system is INTRUSION / ALARM: Generate detailed procedural steps for PIR walk tests, magnetic contact alignment, panel telemetry dual-path tests, siren dB level calibration.

1. "quotationReferenceCode": e.g. "PQ-${(info.systemTypes?.[0] || 'ENG').toUpperCase()}-2026-08-${Math.floor(100 + Math.random()*900)}"
2. "quotationHeader": {
     "attentionTo": "${info.clientContactName || info.clientName || 'Building Administration / Facilities Head'}",
     "thru": "Building Manager / Property Operations",
     "emailAdd": "${info.clientEmail || 'client@company.com'}",
     "contactNo": "${info.clientPhone || '0917-000-0000'}",
     "company": "${info.clientName || 'CLIENT CORPORATION'}",
     "address": "${info.location || 'Metro Manila, Philippines'}",
     "projectSite": "${info.location || 'Site Location'}",
     "projectTitle": "${info.projectName || `${systemLabel.toUpperCase()} PREVENTIVE MAINTENANCE & UPGRADE FY: 2026`}",
     "quoteDate": "${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}",
     "validityPeriod": "30 days from date of this quotation"
   }
3. "deviceSummary": {
     "facpBrand": "${info.selectedBrand && info.selectedBrand !== 'Generalized / Any Brand' ? info.selectedBrand.toUpperCase() : 'EQUIPMENT OEM SPECIFIED'}",
     "systemType": "${systemLabel.toUpperCase()} SYSTEM",
     "totalUnitsText": "Hardware & Active Devices Breakdown (TOTAL: calculated units)",
     "buildingProfile": "${info.floors || 1} FLOORS ${info.buildingType ? `(${info.buildingType})` : ''}",
     "workingSchedule": "DAY SHIFT 8AM-5PM ONLY | MONDAY TO SATURDAY SCHEDULE",
     "remarks": "HIGH CEILING: NONE, ORDINARY HEIGHT | INTEGRATION: AS SPECIFIED"
   }
4. "generalRequirements": [
     { "itemNumber": 1, "description": "Mobilization/Demobilization/Delivery of Equipment & Materials", "qty": 1, "unit": "LOT", "unitPrice": 12500, "totalPrice": 12500 },
     { "itemNumber": 2, "description": "CGL Insurance and Performance Bonds and other insurance\n(not included in this quotation)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
     { "itemNumber": 3, "description": "Daily Housekeeping and Proper Disposal of Waste", "qty": 1, "unit": "LOT", "unitPrice": 2000, "totalPrice": 2000 },
     { "itemNumber": 4, "description": "Safety, signs & barriers ( PPE,fire ext,etc.)& Safety Officer\n(not required, not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
     { "itemNumber": 5, "description": "Administrative and Regular Coordination Works", "qty": 1, "unit": "LOT", "unitPrice": 3000, "totalPrice": 3000 },
     { "itemNumber": 6, "description": "Annual Professional Electronics Engineer (PECE) Certification\n(not required, not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
     { "itemNumber": 7, "description": "Manpower Accomodation N/A", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
     { "itemNumber": 8, "description": "Site management and Supervision.", "qty": 1, "unit": "LOT", "unitPrice": 10000, "totalPrice": 10000 },
     { "itemNumber": 9, "description": "Temfacil / Staging Area PROVIDED BY THE CLIENT", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
     { "itemNumber": 10, "description": "Certificate of Safety and Reliability\nCertificate of ${systemLabel} Testing and Completion\nwith sign and seal of PECE (not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 }
   ]
5. "scopeOfWorks": [
     // 9 procedural line items with numbered multi-step procedural cleaning and diagnostic actions matching ${systemLabel}
   ]
6. "costBreakdown": {
     "itemATotal": 27500,
     "itemBTotal": (Total cost of scope of works, equipment and labor in PHP),
     "subTotal": (itemATotal + itemBTotal),
     "discount": (proportional realistic discount in PHP),
     "subTotalWithDiscount": (subTotal - discount),
     "vat12Percent": (12% of subTotalWithDiscount),
     "grandTotalAmount": (subTotalWithDiscount + vat12Percent)
   }
7. "scheduleOfPayment": [
     { "itemCode": "A", "milestone": "1st QUARTER / Mobilization Downpayment (40%)", "qty": 1, "unit": "LOT", "unitPrice": (40% of grandTotalAmount), "totalPrice": (40% of grandTotalAmount) },
     { "itemCode": "B", "milestone": "2nd QUARTER / Progress Billing (20%)", "qty": 1, "unit": "LOT", "unitPrice": (20% of grandTotalAmount), "totalPrice": (20% of grandTotalAmount) },
     { "itemCode": "C", "milestone": "3rd QUARTER / Progress Billing (20%)", "qty": 1, "unit": "LOT", "unitPrice": (20% of grandTotalAmount), "totalPrice": (20% of grandTotalAmount) },
     { "itemCode": "D", "milestone": "4th QUARTER / Final Testing & Turnover (20%)", "qty": 1, "unit": "LOT", "unitPrice": (20% of grandTotalAmount), "totalPrice": (20% of grandTotalAmount) }
   ]
8. "termsAndConditions": [
     "Unless specified, above given prices are still subject for EVAT computation.",
     "Prices are based on cost and conditions existing on date of quotation and are subject to change by the Seller upon final acceptance.",
     "Internal or External Local or wide area Network cabling for the purpose of remote monitoring is not included in this quotation, and shall be paid separately.",
     "If the Client opted to use their existing CPU/ Server which is bundled with Operating systems and/or Software Programs related to their daily operations, it must be compliant to the remote monitoring system purchased, otherwise, it would disable the intended normal function, and a separately price quotation for System Evaluation and Re-programming compatibility is needed to correct it.",
     "Government permits and approvals which might be needed to complete the above work are not included in the scope of works unless specified in this quotation.",
     "Circuit Breakers, temporarily or permanent electrical source shall be provided by client.",
     "The company guarantees the original user that the equipment and devices will be free of defects in material and workmanship for a period as stated below from the date of delivery provided the products has not been abused, misused or improperly maintained and /or repaired by unauthorized service personnel; or such defect on the product is the result of voltage surges / brownouts, lightning, water damage, flooding, fire, earthquakes, acts of aggression/ war or other similar phenomenon w/c the company has no control of, will such void the warranty.",
     "Others: Any other materials/equipment/permits/installation works not stated herein shall be considered as ADDITIONAL COST.",
     "Bonds: Unless otherwise stipulated in the investment summary, all premium costs for surety bonds, performance bonds, Contractors all-risk insurance, Warranty Bond for the account of the client.",
     "Warehouse Charges/Penalties: There will be a 500 pesos penalty per day, if devices are not picked up upon notice of availability",
     "A penalty charge of 40% of the total contract price will be imposed for cancellation of Purchase Order.",
     "Late Payment Penalty Charge: Any payments not made within the specified period of time for payment will incur an interest charge at the rate of 1% of the total contract price."
   ]

CRITICAL: Do NOT set pricing to 0. You MUST estimate/calculate realistic market prices in Philippine Pesos (PHP) based on typical industry rates in the Philippines. For each item in the "consumables" array, you MUST provide:
- "srp": Suggested Retail Price in PHP (realistic retail market rate).
- "contractorPrice": Contractor Price in PHP (typically 10-15% lower than srp).
- "dealerPrice": Dealer Price in PHP (typically 15-25% lower than srp).

CRITICAL FOR JSON VALIDITY: All newlines inside string values MUST be written as the two-character sequence \n (escaped), NEVER raw unescaped line breaks.
Respond ONLY with a single valid JSON object. No markdown fences, no explanation:

{
  "quotationReferenceCode": "PQ-FDAS-2026-08-013",
  "quotationHeader": {
    "attentionTo": "Mr. Jon Carlo A. Castronuevo",
    "thru": "Building Manager",
    "emailAdd": "jollibee_center@yahoo.com",
    "contactNo": "0917 709 1015",
    "company": "JOLLIBEE CENTER CONDOMINIUM CORPORATION",
    "address": "San Miguel Ave., Ortigas Center, Brgy. San Antonio, Pasig City",
    "projectSite": "Pasig City",
    "projectTitle": "FDAS PREVENTIVE MAINTENANCE FY: 2026 (QUARTERLY)",
    "quoteDate": "AUGUST 12, 2026",
    "validityPeriod": "30 days from date of this quotation"
  },
  "deviceSummary": {
    "facpBrand": "ASENWARE",
    "systemType": "ADDRESSABLE FDAS",
    "totalUnitsText": "1- FACP, 457-SD, 18-HD, 36-H/S, 36-MPS, 19 sets of modules for WF/TS (TOTAL: 567 UNITS)",
    "buildingProfile": "16 FLOORS WITH 3 BASEMENT",
    "workingSchedule": "DAY SHIFT 8AM-5PM ONLY | MONDAY TO SATURDAY SCHEDULE",
    "remarks": "HIGH CEILING: NONE, ORDINARY HEIGHT | INTEGRATION: NOT DECLARED"
  },
  "generalRequirements": [
    { "itemNumber": 1, "description": "Mobilization/Demobilization/Delivery of Equipment & Materials", "qty": 1, "unit": "LOT", "unitPrice": 12500, "totalPrice": 12500 },
    { "itemNumber": 2, "description": "CGL Insurance and Performance Bonds and other insurance\n(not included in this quotation)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
    { "itemNumber": 3, "description": "Daily Housekeeping and Proper Disposal of Waste", "qty": 1, "unit": "LOT", "unitPrice": 2000, "totalPrice": 2000 },
    { "itemNumber": 4, "description": "Safety, signs & barriers ( PPE,fire ext,etc.)& Safety Officer\n(not required, not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
    { "itemNumber": 5, "description": "Administrative and Regular Coordination Works", "qty": 1, "unit": "LOT", "unitPrice": 3000, "totalPrice": 3000 },
    { "itemNumber": 6, "description": "Annual Professional Electronics Engineer (PECE) Certification\n(not required, not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
    { "itemNumber": 7, "description": "Manpower Accomodation N/A", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
    { "itemNumber": 8, "description": "Site management and Supervision.", "qty": 1, "unit": "LOT", "unitPrice": 10000, "totalPrice": 10000 },
    { "itemNumber": 9, "description": "Temfacil / Staging Area PROVIDED BY THE CLIENT", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 },
    { "itemNumber": 10, "description": "Certificate of Safety and Reliability\nCertificate of FDAS Testing and Completion\nwith sign and seal of PECE (not included)", "qty": 1, "unit": "LOT", "unitPrice": 0, "totalPrice": 0 }
  ],
  "scopeOfWorks": [
    {
      "itemNumber": 1,
      "description": "FIRE ALARM CONTROL PANEL\nGeneral Cleaning\n1. Air dust using portable air blower with non-conductive bristle inside and out.\n2. Use glass cleaners on glass cabinet covers.\n3. Use multi-purpose cleaner on Fire Alarm Control Panel Cabinet.",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 2,
      "description": "MANUAL STATIONS /HORN STROBE / BELL\nGeneral Cleaning\n1. Air dusting portable air blower with non-conductive bristle brush inside and out.\n2. Polish with \"Armour All or its equivalent\" inside and out.\n3. Replace damaged break glass or rod.\n4. Spray contact cleaners.\n5. Tightening of terminal screw plugs.",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 3,
      "description": "DETECTORS / SENSORS\nGeneral Cleaning\n1. Air dusting of the chamber using portable air blower with non-conductive bristle brush.\n2. Check mounting and fix if needed.\n3. Polish with \"Armour All / or its equivalent\" the smoke chamber vents.\n4. Air dusting and polishing of detector base\n5. Spray contact cleaners on terminals.\n6. Re-tightening of wire termination to ensure no loose connections.\n7. Air dusting of smoke chamber screen.\n8. Use \"Armour All or equivalent\" for parts that cannot be cleaned by soap and water.\n9. Provision of wire tagging and terminal lugs.",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 4,
      "description": "PROVIDING CERTIFICATE OF TESTING AND CERTIFICATE OF COMPLETION.\n1. For the purpose of FSIC Renewal, we can provide the Fire Safety Maintenance Report (FSMR) signed by the building Admin and the FDAS service provider.\n2. Should in case we need the sign of the Fire Safety Practitioner (FSP), this shall be billed separately\n3. Reprogramming of address/location shall be billed separately after the PM for FDAS addressable devices only (If any)",
      "unit": "1 LOT",
      "totalPrice": 164590
    },
    {
      "itemNumber": 5,
      "description": "REPLACEMENT OF DAMAGE DEVICES - This shall be billed SEPARATELY OR SUPPLY BY THE OWNER.\n1. Relocation, rewiring, roughing ins are not included in this proposal.\n2. Issuance of WARRANTY CERTIFICATE FOR 1 YEAR for the newly installed devices/equipments (if any)",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 6,
      "description": "FREQUENCY: QUARTERLY ACTIVITY OF FDAS PMS\n• Submission of Testing/Technical report after the PM.\n• Cleaning of all the equipment listed above.\n• Inspection of all the equipment listed above.\n• Functional testing of detectors and devices including FACP.\n• Submission of completion report.",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 7,
      "description": "SMOKE DETECTOR TESTER - using smoke canister\n• Testing of smoke detector for functionality\n• Allocation: 2 cans of smoke canister",
      "unit": "2 CANS",
      "totalPrice": 3800
    },
    {
      "itemNumber": 8,
      "description": "RENTAL OF TOOLS AND EQUIPMENTS\n• A-Type Ladder or 4 folds ladder\n• Basic technical tools including Multi-tester, Tone Tracer, Clamp meter\n• Cleaning materials and liquid solutions as cleanser for the devices",
      "unit": "1 LOT",
      "totalPrice": 0
    },
    {
      "itemNumber": 9,
      "description": "FREEBIES:\n• Emergency Service response: 1x per quarter total of 4x per year\n• BFP Simulation Testing/BFP Fire Drill: 1x per year",
      "unit": "1 LOT",
      "totalPrice": 0
    }
  ],
  "costBreakdown": {
    "itemATotal": 27500,
    "itemBTotal": 168390,
    "subTotal": 195890,
    "discount": 8390,
    "subTotalWithDiscount": 187500,
    "vat12Percent": 22500,
    "grandTotalAmount": 210000
  },
  "scheduleOfPayment": [
    { "itemCode": "A", "milestone": "1st QUARTER / Mobilization Downpayment (40%)", "qty": 1, "unit": "LOT", "unitPrice": 84000, "totalPrice": 84000 },
    { "itemCode": "B", "milestone": "2nd QUARTER / Progress Billing (20%)", "qty": 1, "unit": "LOT", "unitPrice": 42000, "totalPrice": 42000 },
    { "itemCode": "C", "milestone": "3rd QUARTER / Progress Billing (20%)", "qty": 1, "unit": "LOT", "unitPrice": 42000, "totalPrice": 42000 },
    { "itemCode": "D", "milestone": "4th QUARTER / Final PMS & FSMR Turnover (20%)", "qty": 1, "unit": "LOT", "unitPrice": 42000, "totalPrice": 42000 }
  ],
  "termsAndConditions": [
    "Unless specified, above given prices are still subject for EVAT computation.",
    "Prices are based on cost and conditions existing on date of quotation and are subject to change by the Seller upon final acceptance.",
    "Internal or External Local or wide area Network cabling for the purpose of remote monitoring is not included in this quotation, and shall be paid separately.",
    "If the Client opted to use their existing CPU/ Server which is bundled with Operating systems and/or Software Programs related to their daily operations, it must be compliant to the remote monitoring system purchased, otherwise, it would disable the intended normal function, and a separately price quotation for System Evaluation and Re-programming compatibility is needed to correct it.",
    "Government permits and approvals which might be needed to complete the above work are not included in the scope of works unless specified in this quotation.",
    "Circuit Breakers, temporarily or permanent electrical source shall be provided by client.",
    "The company guarantees the original user that the equipment and devices will be free of defects in material and workmanship for a period as stated below from the date of delivery provided the products has not been abused, misused or improperly maintained and /or repaired by unauthorized service personnel.",
    "Others: Any other materials/equipment/permits/installation works not stated herein shall be considered as ADDITIONAL COST.",
    "Bonds: Unless otherwise stipulated in the investment summary, all premium costs for surety bonds, performance bonds, Contractors all-risk insurance, Warranty Bond for the account of the client.",
    "Warehouse Charges/Penalties: There will be a 500 pesos penalty per day, if devices are not picked up upon notice of availability",
    "A penalty charge of 40% of the total contract price will be imposed for cancellation of Purchase Order.",
    "Late Payment Penalty Charge: Any payments not made within the specified period of time for payment will incur an interest charge at the rate of 1% of the total contract price."
  ],
  "observations": "LEGEND DETECTED: Extracted symbol definitions from Floor Plan Legend Sheet. PLOTTED EQUIPMENT PLAN DETECTED: Analyzed plotted icon positions across FDAS, Access Control, IDS, and CCTV sheets. The floor plan includes a detailed layout of an office space with designated areas for offices, conference rooms, server rooms, toilets, and lobbies. Security equipment such as CCTV cameras, access control devices, intrusion detection sensors, and fire detection/alarm systems are plotted throughout the floor. Brands specified include Honeywell for IDS and access panels, HID for card readers, and generic symbols for other devices like smoke detectors, manual call points, and emergency lights.",
  "confidenceScore": 95,
  "manpower": [
    { "role": "Lead Security Engineer", "headcount": 1, "hours": 80, "manDays": 10, "dayRate": 1000, "totalCost": 10000 },
    { "role": "Safety Officer", "headcount": 1, "hours": 80, "manDays": 10, "dayRate": 1000, "totalCost": 10000 },
    { "role": "System Installer", "headcount": 3, "hours": 240, "manDays": 30, "dayRate": 1000, "totalCost": 30000 },
    { "role": "Technical Assistant", "headcount": 2, "hours": 160, "manDays": 20, "dayRate": 1000, "totalCost": 20000 }
  ],
  "consumables": [
    { "name": "Optical Smoke Detector with Base", "brand": "Asenware", "category": "Hardware", "quantity": 457, "unit": "pcs", "srp": 1850, "contractorPrice": 1600, "dealerPrice": 1400, "totalPrice": 845450 },
    { "name": "Heat Detector Rate of Rise", "brand": "Asenware", "category": "Hardware", "quantity": 18, "unit": "pcs", "srp": 1950, "contractorPrice": 1700, "dealerPrice": 1500, "totalPrice": 35100 },
    { "name": "Horn Strobe 24VDC Red", "brand": "Asenware", "category": "Hardware", "quantity": 36, "unit": "pcs", "srp": 2800, "contractorPrice": 2450, "dealerPrice": 2200, "totalPrice": 100800 },
    { "name": "Manual Pull Station Addressable Dual Action", "brand": "Asenware", "category": "Hardware", "quantity": 36, "unit": "pcs", "srp": 3200, "contractorPrice": 2800, "dealerPrice": 2500, "totalPrice": 115200 },
    { "name": "Input / Monitor Module for Waterflow/Tamper Switch", "brand": "Asenware", "category": "Hardware", "quantity": 19, "unit": "sets", "srp": 4200, "contractorPrice": 3700, "dealerPrice": 3300, "totalPrice": 79800 },
    { "name": "Addressable Fire Alarm Control Panel 4-Loop", "brand": "Asenware", "category": "Hardware", "quantity": 1, "unit": "unit", "srp": 145000, "contractorPrice": 128000, "dealerPrice": 115000, "totalPrice": 145000 },
    { "name": "Fire-Resistant Shielded Twisted Pair Cable 2x1.5mm2", "brand": "Generic", "category": "Wires & Cables", "quantity": 1200, "unit": "meters", "srp": 65, "contractorPrice": 55, "dealerPrice": 48, "totalPrice": 78000 },
    { "name": "1/2\" EMT Conduit Pipe with Connectors & Couplings", "brand": "Generic", "category": "Roughing-ins", "quantity": 350, "unit": "lengths", "srp": 240, "contractorPrice": 210, "dealerPrice": 190, "totalPrice": 84000 }
  ],
  "fees": [
    { "type": "Travel Fee", "amount": 5000, "description": "Mobilization to site (Metro Manila)" },
    { "type": "Permit Fee", "amount": 10000, "description": "Local government permits and approvals" }
  ],
  "constraints": {
    "physical": "Ceiling height is ~3m with gypsum board and concrete walls. Limited space in server room for additional equipment. Main entrances and fire exits must remain unobstructed during installation.",
    "electrical": "Client must provide dedicated 220V power circuits for DVR, FACP, and access control panel. UPS backup required for critical systems (DVR, FACP, IDS Panel). Electrical DB room located near server room.",
    "installation": "Installation must be conducted during non-business hours (6PM-6AM) to avoid disruption. Access to all areas must be granted 24/7 for installation and testing. Safety officer required on-site at all times."
  }
}`;
}

async function callMistral(
  messages: object[],
  model: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_MISTRAL_API_KEY || (typeof localStorage !== 'undefined' ? localStorage.getItem('mistral_api_key') : '') || '';
  if (!apiKey) {
    throw new Error('Mistral API key (VITE_MISTRAL_API_KEY) is not set. Add it to your .env file or Settings.');
  }

  const isVision = model === MISTRAL_VISION_MODEL;
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.1,
    max_tokens: 16384,
  };

  if (!isVision) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errMsg = `Mistral API error (${response.status})`;
    try {
      const errData = await response.json();
      errMsg = errData?.message || errData?.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  const rawText: string | undefined = data?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Mistral returned an empty response. Try again.');
  return rawText;
}

// Text-only call helper
async function callMistralText(
  userContent: string,
  model: string,
  systemPrompt?: string,
): Promise<string> {
  const messages: object[] = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userContent });
  return callMistral(messages, model);
}

// Vision call — passes images as base64 data URIs alongside the text prompt
async function callMistralVision(
  imageParts: { inlineData: { mimeType: string; data: string } }[],
  text: string,
  model: string,
): Promise<string> {
  const contentParts: object[] = [
    ...imageParts.map(p => ({
      type: 'image_url',
      image_url: {
        url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}`,
      },
    })),
    { type: 'text', text },
  ];
  const messages = [{ role: 'user', content: contentParts }];
  return callMistral(messages, model);
}

function sanitizeJsonString(str: string): string {
  const lines = str.split('\n').map(line => {
    const idx = line.indexOf('//');
    if (idx !== -1 && line.indexOf('http://') === -1 && line.indexOf('https://') === -1) {
      return line.substring(0, idx);
    }
    return line;
  });
  return lines.join('\n');
}

function parseAndRepairJson<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from AI service.');
  }

  let cleaned = rawText
    .replace(/^```(?:json)?\s*/gi, '')
    .replace(/\s*```$/gi, '')
    .trim();

  const startIdx = cleaned.indexOf('{');
  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf('}');
    if (endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    } else {
      cleaned = cleaned.substring(startIdx);
    }
  }

  let sanitized = cleaned
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,(\s*[\]}])/g, '$1');

  sanitized = sanitizeJsonString(sanitized);

  sanitized = sanitized.replace(/\}\s*\{/g, '},{');
  sanitized = sanitized.replace(/"\s*\n\s*"/g, '",\n"');

  try {
    return JSON.parse(sanitized);
  } catch (err: any) {
    console.warn('Initial JSON parse failed, attempting auto-repair:', err.message);
  }

  let str = sanitized.trim();
  str = str.replace(/,\s*"[^"]*"?\s*:?\s*("[^"]*)?$/, '');
  str = str.replace(/,\s*$/, '');

  let inString = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inString = !inString;
    }
  }
  if (inString) {
    str += '"';
  }
  str = str.replace(/,\s*$/, '');

  const stack: string[] = [];
  inString = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && (i === 0 || str[i - 1] !== '\\')) {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') stack.pop();
      }
    }
  }

  let repaired = str;
  while (stack.length > 0) {
    const openToken = stack.pop();
    repaired += openToken === '{' ? '}' : ']';
  }

  repaired = repaired.replace(/,(\s*[\]}])/g, '$1');

  try {
    return JSON.parse(repaired);
  } catch (err2: any) {
    console.error('JSON Repair failed. String attempted:', repaired);
    throw new Error(`AI response format error: Could not parse response JSON (${err2.message})`);
  }
}

function extractJson(raw: string): Record<string, any> {
  return parseAndRepairJson(raw);
}

// ─── Main export ──────────────────────────────────────────────────────────────
export async function analyzeFloorPlan(
  imageFiles: File[],
  surveyType: string,
  buildingInfo: {
    buildingType?: string;
    floors?: number;
    location?: string;
    projectName?: string;
    surveyScope?: string;
    torContent?: string;
    selectedBrand?: string;
    clientName?: string;
    clientContactName?: string;
    clientEmail?: string;
    clientPhone?: string;
    systemTypes?: string[];
  }
): Promise<FloorPlanEstimation> {
  // Convert images to base64; extract text from documents
  const imageParts: { inlineData: { mimeType: string; data: string } }[] = [];
  let extractedDocsContent = '';

  if (imageFiles && imageFiles.length > 0) {
    for (const file of imageFiles) {
      const mime = getMimeType(file);
      if (mime.startsWith('image/')) {
        try {
          const base64 = await compressImage(file);
          imageParts.push({ inlineData: { mimeType: 'image/jpeg', data: base64 } });
        } catch (err) {
          console.warn('Image compression failed, falling back to raw base64:', err);
          const base64 = await fileToBase64(file);
          imageParts.push({ inlineData: { mimeType: mime, data: base64 } });
        }
      } else {
        try {
          const parsed = await parseFile(file);
          if (parsed && parsed.content) {
            extractedDocsContent += `\n\n=== DOCUMENT CONTENT: ${file.name} ===\n${parsed.content}\n`;
          }
        } catch (err) {
          console.error(`Failed to parse document text for ${file.name}:`, err);
        }
      }
    }
  }

  const combinedInfo = {
    ...buildingInfo,
    torContent: `${buildingInfo.torContent || ''}${extractedDocsContent}`.trim(),
  };

  let analysis: Record<string, unknown> = {};

  if (imageParts.length > 0 || extractedDocsContent) {
    const phase1Prompt = buildAnalysisPrompt(surveyType, combinedInfo);
    let phase1Raw = '';

    if (imageParts.length > 0) {
      // Phase 1: Pixtral vision model for floor plan images
      console.log('Floor plan images detected. Using Mistral Pixtral vision for Phase 1 analysis...');
      try {
        phase1Raw = await callMistralVision(imageParts, phase1Prompt, MISTRAL_VISION_MODEL);
      } catch (err: any) {
        console.warn(`Pixtral vision failed: ${err.message || err}. Falling back to text-only analysis...`);
        phase1Raw = await callMistralText(phase1Prompt, MISTRAL_REASONING_MODEL, 'You are a precise floor plan analyzer. Return JSON only.');
      }
    } else {
      // Text-based documents only
      console.log('No floor plan images uploaded. Using Mistral text model for document structure analysis...');
      phase1Raw = await callMistralText(phase1Prompt, MISTRAL_REASONING_MODEL, 'You are a precise document analyzer. Return JSON only.');
    }

    try {
      analysis = extractJson(phase1Raw);
    } catch {
      console.warn('Phase 1 analysis parse failed, falling back to building info only');
      analysis = {
        floorCount: combinedInfo.floors || 1,
        estimatedTotalAreaSqm: (combinedInfo.floors || 1) * 300,
        observations: 'Floor plan / technical specifications analyzed from building information.',
      };
    }
  } else {
    // No files at all — simulate from building info
    analysis = {
      floorCount: combinedInfo.floors || 1,
      estimatedTotalAreaSqm: (combinedInfo.floors || 1) * 300,
      observations: `Estimation generated dynamically using building type: ${combinedInfo.buildingType || 'Office'} and floor count: ${combinedInfo.floors || 1}.`,
    };
  }

function sanitizeBoqResult(raw: any): FloorPlanEstimation {
  const safe: FloorPlanEstimation = {
    quotationReferenceCode: typeof raw?.quotationReferenceCode === 'string' ? raw.quotationReferenceCode : `PQ-BOQ-${Date.now().toString().slice(-6)}`,
    quotationHeader: {
      attentionTo: raw?.quotationHeader?.attentionTo || 'Client Representative',
      thru: raw?.quotationHeader?.thru || 'Project Manager',
      emailAdd: raw?.quotationHeader?.emailAdd || 'client@company.com',
      contactNo: raw?.quotationHeader?.contactNo || 'N/A',
      company: raw?.quotationHeader?.company || 'Project Client',
      address: raw?.quotationHeader?.address || 'Metro Manila',
      projectSite: raw?.quotationHeader?.projectSite || 'Metro Manila',
      projectTitle: raw?.quotationHeader?.projectTitle || 'Security & Safety Systems Installation',
      quoteDate: raw?.quotationHeader?.quoteDate || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      validityPeriod: raw?.quotationHeader?.validityPeriod || '30 days from date of quotation',
    },
    deviceSummary: {
      facpBrand: raw?.deviceSummary?.facpBrand || 'Standard Carried Brand',
      systemType: raw?.deviceSummary?.systemType || 'Security Systems',
      totalUnitsText: raw?.deviceSummary?.totalUnitsText || 'Total Units: As Estimated',
      buildingProfile: raw?.deviceSummary?.buildingProfile || 'Commercial / Office Facility',
      workingSchedule: raw?.deviceSummary?.workingSchedule || 'Regular Shift (8AM-5PM)',
      remarks: raw?.deviceSummary?.remarks || 'Subject to site verification',
    },
    generalRequirements: Array.isArray(raw?.generalRequirements)
      ? raw.generalRequirements.map((g: any, i: number) => ({
          itemNumber: Number(g?.itemNumber) || i + 1,
          description: String(g?.description || 'General Requirement Item'),
          qty: Number(g?.qty) || 1,
          unit: String(g?.unit || 'LOT'),
          unitPrice: Number(g?.unitPrice) || 0,
          totalPrice: Number(g?.totalPrice) || Number(g?.unitPrice) || 0,
        }))
      : [],
    scopeOfWorks: Array.isArray(raw?.scopeOfWorks)
      ? raw.scopeOfWorks.map((s: any, i: number) => ({
          itemNumber: Number(s?.itemNumber) || i + 1,
          description: String(s?.description || 'Scope Item'),
          unit: String(s?.unit || '1 LOT'),
          totalPrice: Number(s?.totalPrice) || 0,
        }))
      : [],
    costBreakdown: {
      itemATotal: Number(raw?.costBreakdown?.itemATotal) || 0,
      itemBTotal: Number(raw?.costBreakdown?.itemBTotal) || 0,
      subTotal: Number(raw?.costBreakdown?.subTotal) || 0,
      discount: Number(raw?.costBreakdown?.discount) || 0,
      subTotalWithDiscount: Number(raw?.costBreakdown?.subTotalWithDiscount) || 0,
      vat12Percent: Number(raw?.costBreakdown?.vat12Percent) || 0,
      grandTotalAmount: Number(raw?.costBreakdown?.grandTotalAmount) || 0,
    },
    scheduleOfPayment: Array.isArray(raw?.scheduleOfPayment)
      ? raw.scheduleOfPayment.map((p: any) => ({
          itemCode: String(p?.itemCode || 'A'),
          milestone: String(p?.milestone || 'Project Milestone'),
          qty: Number(p?.qty) || 1,
          unit: String(p?.unit || 'LOT'),
          unitPrice: Number(p?.unitPrice) || 0,
          totalPrice: Number(p?.totalPrice) || Number(p?.unitPrice) || 0,
        }))
      : [],
    termsAndConditions: Array.isArray(raw?.termsAndConditions)
      ? raw.termsAndConditions.map((t: any) => String(t || ''))
      : [],
    manpower: Array.isArray(raw?.manpower)
      ? raw.manpower.map((m: any) => {
          const headcount = Number(m?.headcount) || 1;
          const hours = Number(m?.hours) || 8;
          const manDays = Number(m?.manDays) || Math.ceil((headcount * hours) / 8);
          const ratePerDay = Number(m?.ratePerDay) || 1000;
          const totalCost = Number(m?.totalCost) || ratePerDay * manDays;
          return {
            role: String(m?.role || 'Installer'),
            headcount,
            hours,
            manDays,
            ratePerDay,
            totalCost,
          };
        })
      : [],
    consumables: Array.isArray(raw?.consumables)
      ? raw.consumables.map((c: any) => {
          const quantity = Number(c?.quantity) || 1;
          const unitPrice = Number(c?.unitPrice) || Number(c?.srp) || 0;
          const totalPrice = Number(c?.totalPrice) || unitPrice * quantity;
          return {
            name: String(c?.name || 'Equipment Item'),
            category: String(c?.category || 'Hardware'),
            quantity,
            unit: String(c?.unit || 'pcs'),
            unitPrice,
            srp: Number(c?.srp) || unitPrice,
            contractorPrice: Number(c?.contractorPrice) || unitPrice,
            dealerPrice: Number(c?.dealerPrice) || unitPrice,
            totalPrice,
          };
        })
      : [],
    fees: Array.isArray(raw?.fees)
      ? raw.fees.map((f: any) => ({
          type: String(f?.type || 'Fee'),
          amount: Number(f?.amount) || 0,
          description: String(f?.description || ''),
        }))
      : [],
    constraints: {
      physical: String(raw?.constraints?.physical || 'Standard site physical conditions.'),
      electrical: String(raw?.constraints?.electrical || '220V power supply available at main DB.'),
      installation: String(raw?.constraints?.installation || 'Standard working hours installation access.'),
    },
    confidenceScore: typeof raw?.confidenceScore === 'number' ? raw.confidenceScore : 85,
    observations: String(raw?.observations || 'Analysis completed successfully.'),
  };
  return safe;
}

/**
 * Attempts to extract the roll/reel length in meters from a pricelist item description.
 * e.g. "CAT6 23AWG UTP cable (305m roll)" → 305
 * Returns null if no roll length can be found.
 */
function extractRollLengthFromDescription(description: string): number | null {
  const match = description.match(/(\d+)\s*m\b/i);
  if (match) {
    const len = parseInt(match[1], 10);
    // Sanity-check: typical roll lengths are 50–1000m
    if (len >= 50 && len <= 2000) return len;
  }
  return null;
}

/** Returns true if the unit string indicates meters (linear measurement) */
function isMetricUnit(unit: string): boolean {
  const u = (unit || '').trim().toLowerCase();
  return u === 'm' || u === 'meters' || u === 'meter' || u === 'mtrs' || u === 'mtr';
}

  const phase2Prompt = buildBoqPrompt(surveyType, combinedInfo, analysis);
  const phase2Raw = await callMistralText(phase2Prompt, MISTRAL_REASONING_MODEL);
  let boq = extractJson(phase2Raw);
  boq = sanitizeBoqResult(boq);

  if (boq.consumables && Array.isArray(boq.consumables)) {
    const resolvedConsumables = [];
    for (const c of boq.consumables) {
      try {
        const est = await getEstimatedItemPricing(c.name, 'contractor');
        const srpPerUnit = est.price;       // price per roll/unit as listed in pricelist
        const contractorPrice = est.contractorPrice;
        const dealerPrice = est.dealerPrice;
        const name = est.isAlternative
          ? `${est.brand} ${est.model} (Rec. Alt for ${c.name})`
          : (est.model && est.model !== c.name ? `${est.brand} ${est.model}` : c.name);

        // --- Unit Conversion: meters → rolls ---
        // If the BOQ says "300 meters" but the pricelist item is priced per roll (e.g. 305m roll),
        // we must divide to get how many rolls are needed, then price by the roll.
        let displayQty = c.quantity;
        let displayUnit = c.unit;
        let computedSrp = srpPerUnit;
        let totalPrice: number;

        if (isMetricUnit(c.unit) && est.foundInPricelist) {
          const rollLength = extractRollLengthFromDescription(est.description || '');
          if (rollLength) {
            const rollsNeeded = Math.ceil(c.quantity / rollLength);
            totalPrice = srpPerUnit * rollsNeeded;
            // Show qty as rolls, annotate with total meters for transparency
            displayQty = rollsNeeded;
            displayUnit = `roll(s) (${c.quantity}m @ ${rollLength}m/roll)`;
            computedSrp = srpPerUnit; // unit price stays per-roll
          } else {
            // No roll length found — price is likely already per-meter
            totalPrice = srpPerUnit * c.quantity;
          }
        } else {
          totalPrice = srpPerUnit * c.quantity;
        }

        resolvedConsumables.push({
          ...c,
          name,
          brand: est.brand || (c as any).brand || '',
          srp: computedSrp,
          contractorPrice,
          dealerPrice,
          unitPrice: computedSrp,
          quantity: displayQty,
          unit: displayUnit,
          totalPrice
        });
      } catch {
        const srp = c.srp || c.unitPrice || 0;
        const contractorPrice = c.contractorPrice || Math.round(srp * 0.85);
        const dealerPrice = c.dealerPrice || Math.round(srp * 0.75);
        const totalPrice = c.totalPrice || (srp * c.quantity);
        resolvedConsumables.push({ ...c, srp, contractorPrice, dealerPrice, unitPrice: srp, totalPrice });
      }
    }
    boq.consumables = resolvedConsumables;
  }

  if (analysis.observations && typeof analysis.observations === 'string') {
    const obsStr = analysis.observations as string;
    if (obsStr.length > (boq.observations?.length || 0)) {
      boq.observations = obsStr;
    }
  }

  return sanitizeBoqResult(boq);
}

export async function testMistralConnection(): Promise<string> {
  return callMistralText('Reply with just: OK', MISTRAL_REASONING_MODEL);
}
