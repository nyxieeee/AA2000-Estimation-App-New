# AA2000 Site Survey

Site survey and estimation platform for electronic security systems (CCTV, Fire Alarm, Access Control, Burglar Alarm, Fire Protection, and more). Built with React + TypeScript on the frontend and Supabase as the backend.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | React 19, TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4, Framer Motion |
| Backend | Supabase (Auth, Postgres, Storage, Edge Functions) |
| AI | Google Gemini (@google/genai) |
| Documents | jsPDF, html2canvas, docx |
| Maps | Leaflet |

## Prerequisites

- Node.js 18+
- A Supabase project (create one at [supabase.com](https://supabase.com))
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey))
- (Optional) A Groq API key for floor-plan analysis ([console.groq.com](https://console.groq.com))

## Getting Started

1. **Clone the repo**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables** — copy `.env.example` to `.env.local` and fill in:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Run database migrations** — execute the SQL in `supabase/migrations/` against your Supabase project (via Dashboard SQL editor or the Supabase CLI).

5. **Start the dev server**
   ```bash
   npm run dev
   ```
   The app runs at `http://localhost:3002`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server (port 3002) |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | TypeScript type checking |

---

## Architecture

### Architecture Diagram

```mermaid
flowchart LR
    subgraph Client["Client-Side (React SPA)"]
        APP["App.tsx<br>State Machine Router"]
        LAYOUT["PortalLayout<br>Sidebar / Header"]
        SURVEYS["Survey Components<br>CCTV / FA / FP / AC / BA / Other"]
        EST["EstimationScreen + BOQ"]
        AI["AIClarification<br>Gemini Chat"]
        SUPABASE_CLIENT["@supabase/supabase-js"]
    end

    subgraph Backend["Supabase (BaaS)"]
        AUTH["Auth<br>Email/Password<br>JWT + RLS"]
        DB[("PostgreSQL<br>profiles, projects,<br>survey_*, estimations,<br>consumables, fees,<br>notifications")]
        STORAGE["Storage<br>floor_plans/<br>site_images/<br>reports/"]
    end

    APP --> LAYOUT
    LAYOUT --> SURVEYS
    LAYOUT --> EST
    SURVEYS --> AI
    AI --> EST

    SUPABASE_CLIENT -.-> AUTH
    SUPABASE_CLIENT -.-> DB
    SUPABASE_CLIENT -.-> STORAGE

    style Client fill:#1e3a5f,color:#fff,stroke:#0d2137
    style Backend fill:#1a4731,color:#fff,stroke:#0d2618
    style AUTH fill:#2d6a4f,color:#fff
    style DB fill:#2d6a4f,color:#fff
    style STORAGE fill:#2d6a4f,color:#fff
```

### Client-Side Layers

| Layer | Files | Role |
|-------|-------|------|
| **State & Routing** | `App.tsx` | Custom state machine routing (20+ screens), URL sync via `history.pushState`/`popstate`, global state buffers |
| **Layout** | `PortalLayout.tsx` | Sidebar navigation, top header, theme toggling, notification bell |
| **Auth** | `Login.tsx`, `AdminLogin.tsx`, `Signup.tsx` | Supabase Auth email/password sign-in/sign-up |
| **Dashboard** | `Dashboard.tsx` | Project list (ongoing/upcoming/history), accept/decline, search/filter |
| **Project** | `ProjectDetails.tsx` | Create/edit project, set scope, assign technicians |
| **Surveys** | `CCTVSurvey.tsx`, `FireAlarmSurvey.tsx`, `AccessControlSurvey.tsx`, `BurglarAlarmSurvey.tsx`, `FireProtectionSurvey.tsx`, `OtherSurvey.tsx`, `IntercomServiceSurveyForm.tsx` | System-specific data collection with floor plan upload |
| **AI** | `AIClarification.tsx`, `geminiService.ts` | Gemini-powered chat for audit questions and narrative generation |
| **Estimation** | `EstimationScreen.tsx`, `BOQ.tsx` | Manpower breakdown, consumables, site constraints, cost calculation, DOCX/PDF generation |
| **Summary** | `SurveySummary.tsx`, `CurrentProjects.tsx` | Final review, approval/rejection, finalized report export |
| **Services** | `src/services/` | Supabase client, Gemini API, Geo location |
| **Utils** | `src/utils/` | Mean pricing calculators, consumable defaults, PDF export, notifications, voice processing |

---

> **Database schema and RLS policies** are in [`supabase/migrations/001_schema.sql`](./supabase/migrations/001_schema.sql) and [`supabase/migrations/002_rls.sql`](./supabase/migrations/002_rls.sql).

---

## Workflow Flowchart

```mermaid
flowchart TD
    START([Start]) --> ROLE{Select Role}
    ROLE --> TECH[Technician]
    ROLE --> ADMIN[Sales / Admin]

    TECH --> TECH_AUTH[Supabase Auth<br>Email / Password]
    ADMIN --> ADMIN_AUTH[Supabase Auth<br>Email / Password]

    TECH_AUTH --> TECH_DASH[Dashboard<br>SELECT assigned projects]
    ADMIN_AUTH --> ADMIN_DASH[Dashboard<br>SELECT all projects<br>INSERT new project]

    TECH_DASH --> RESPONSE{Accept / Decline}
    RESPONSE -->|Accepted| PROJ_DETAILS[Project Details<br>View only]
    RESPONSE -->|Declined| TECH_DASH

    ADMIN_DASH --> PROJ_CREATE[Create Project<br>Set scope, assign techs]
    PROJ_CREATE --> ADMIN_DASH

    PROJ_DETAILS --> PICK_SURVEY[Pick Survey System]

    PICK_SURVEY --> SURVEY_FORM[System-Specific Survey Form]
    SURVEY_FORM --> UPLOAD_FLOOR[Upload Floor Plan<br>→ Storage: floor_plans]
    SURVEY_FORM --> UPLOAD_IMAGES[Upload Site Images<br>→ Storage: site_images]
    SURVEY_FORM --> SAVE_DEVICES[Save Device Data<br>→ INSERT/UPSERT survey_*]

    SAVE_DEVICES --> AI[AI Clarification<br>Gemini Chat + Narrative]

    AI --> ESTIMATION[Estimation Screen]
    ESTIMATION --> MANPOWER[Set Manpower Breakdown]
    ESTIMATION --> CONSUMABLES[Add Consumables]
    ESTIMATION --> FEES[Add Additional Fees]
    ESTIMATION --> CONSTRAINTS[Site Constraints<br>Physical / Electrical / Installation]
    ESTIMATION --> CALC[Auto-calculate Costs]
    ESTIMATION --> UPLOAD_REPORT[Upload Generated Report<br>→ Storage: reports]
    ESTIMATION --> SAVE_EST[INSERT / UPDATE estimations]

    SAVE_EST --> DECIDE{More Surveys?}
    DECIDE -->|Yes| PICK_SURVEY
    DECIDE -->|No| SUMMARY[Summary Screen]

    SUMMARY --> REVIEW{Admin Review}
    REVIEW --> FINALIZE[Finalize Project<br>UPDATE status]
    FINALIZE --> APPROVED[Approved / Rejected]
    APPROVED --> END([End])

    subgraph Supabase
        AUTH[Auth]
        DB[(Postgres<br>profiles, projects,<br>survey_*, estimations)]
        STORAGE[Storage<br>floor_plans, site_images, reports]
    end

    TECH_AUTH -.-> AUTH
    ADMIN_AUTH -.-> AUTH
    TECH_DASH -.-> DB
    ADMIN_DASH -.-> DB
    SAVE_DEVICES -.-> DB
    SAVE_EST -.-> DB
    UPLOAD_FLOOR -.-> STORAGE
    UPLOAD_IMAGES -.-> STORAGE
    UPLOAD_REPORT -.-> STORAGE
    FINALIZE -.-> DB
```

---

## Storage

| Bucket | Visibility | Contents |
|--------|-----------|----------|
| `floor_plans` | Private (RLS) | Floor plan images uploaded during surveys |
| `site_images` | Private (RLS) | Site photos taken during inspection |
| `reports` | Private (RLS) | Generated PDF/DOCX estimation reports |

---

## File Structure

```
src/
├── components/           # React components (screens, layouts)
│   ├── App.tsx           # Root: state machine router
│   ├── PortalLayout.tsx  # Sidebar + header shell
│   ├── Dashboard.tsx     # Main workspace hub
│   ├── Login.tsx         # Technician auth
│   ├── AdminLogin.tsx    # Admin auth
│   ├── Signup.tsx        # Registration
│   ├── ProjectDetails.tsx  # Project creation/editing
│   ├── CCTVSurvey.tsx      # (and 5+ other survey forms)
│   ├── EstimationScreen.tsx # Cost estimation
│   └── SurveySummary.tsx    # Final review
├── services/
│   ├── supabase.ts       # Supabase client init
│   ├── geminiService.ts  # Gemini API wrapper
│   └── summaryAccess.ts
├── utils/                # Pricing calculators, PDF export, helpers
├── hooks/                # Custom React hooks
├── types.ts              # TypeScript interfaces
├── constants.tsx         # Branding, enums
└── main.tsx              # Entry point
```
