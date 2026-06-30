# AA2000 Site Survey — Architecture & Workflow

## Screen State Machine

```mermaid
stateDiagram-v2
  [*] --> Login
  Login --> Dashboard : handleLogin

  Dashboard --> ProjectDetail : select project
  Dashboard --> CreateSurveyForm : "New Survey" (admin)
  Dashboard --> Settings : settings gear
  Dashboard --> Notifications : notification bell
  Dashboard --> CompanyDetail : select company folder

  CompanyDetail --> ProjectDetail : select project inside company
  CompanyDetail --> CreateProjectModal : "New Project"

  ProjectDetail --> SurveyWizard : "Start Survey" (technician)
  ProjectDetail --> EstimationSummary : "View Cost Estimation" (admin/sales)
  ProjectDetail --> SurveySummary : "View Survey Report" (admin/sales)
  ProjectDetail --> Dashboard : back

  SurveyWizard --> EstimationSummary : survey completed
  SurveyWizard --> ProjectDetail : back / cancel

  EstimationSummary --> ProjectDetail : back
  SurveySummary --> ProjectDetail : back

  CreateSurveyForm --> ProjectDetail : save
  CreateSurveyForm --> Dashboard : exit / cancel

  CreateProjectModal --> ProjectDetail : save

  Settings --> Dashboard : back
  Notifications --> Dashboard : back

  Note right of Dashboard : Central hub — all flows converge here
```

## Navigation Sidebar

```mermaid
graph TB
  subgraph Sidebar
    direction TB

    SURVEYS["SURVEYS"]
    HOME["Home"]
    DASHBOARD_VIEW["Dashboard"]
    WORKSPACE["Workspace"]
    NEW_SURVEY["New Survey (admin only)"]
    ALL_PROJECTS["All Projects"]
    MISSING_SPECS["Missing Specs"]

    WORKFLOW["WORKFLOW"]
    APPROVAL["Approval Pipeline (admin)"]
    FINALIZE["Finalize Review (admin)"]
    COMPLETED["Completed Surveys"]
    HISTORY["History Archive"]

    ACCOUNT["ACCOUNT"]
    NOTIF["Notification"]
    SETTINGS["Settings"]
    LOGOUT["Log Out"]

    SURVEYS --> HOME
    SURVEYS --> DASHBOARD_VIEW
    SURVEYS --> WORKSPACE
    SURVEYS --> NEW_SURVEY
    SURVEYS --> ALL_PROJECTS
    SURVEYS --> MISSING_SPECS

    WORKFLOW --> APPROVAL
    WORKFLOW --> FINALIZE
    WORKFLOW --> COMPLETED
    WORKFLOW --> HISTORY

    ACCOUNT --> NOTIF
    ACCOUNT --> SETTINGS
    ACCOUNT --> LOGOUT
  end
```

## Project Lifecycle

```mermaid
flowchart LR
  A[Pending] -->|technician starts survey| B[In Progress]
  B -->|all surveys completed| C[Finalized]
  C -->|admin approves| D[Finalized - Approved]
  C -->|admin rejects| E[Finalized - Rejected]
  D --> F[Completed]
  E --> F

  style A fill:#fbbf24,color:#000
  style B fill:#60a5fa,color:#fff
  style C fill:#a78bfa,color:#fff
  style D fill:#34d399,color:#fff
  style E fill:#f87171,color:#fff
  style F fill:#10b981,color:#fff
```

## Authentication Flow

```mermaid
sequenceDiagram
  participant User
  participant Login
  participant App
  participant LocalStorage

  User->>Login: enters name & selects role
  Login->>App: handleLogin(user)
  App->>App: setUser(user)
  App->>LocalStorage: persist user session
  App->>App: setScreen('dashboard')
  App-->>User: render Dashboard

  Note over App,LocalStorage: On mount, App checks localStorage<br/>for saved session → auto-login
```

## Survey Wizard — Per-Type Steps

```mermaid
flowchart TD
  subgraph CCTV
    CCTV1[Building Info] --> CCTV2[Cameras]
    CCTV2 --> CCTV3[Infrastructure]
    CCTV3 --> CCTV4[Review]
  end

  subgraph FIRE_ALARM
    FA1[Building Info] --> FA2[Detection Areas]
    FA2 --> FA3[Control Panel]
    FA3 --> FA4[Review]
  end

  subgraph ACCESS_CONTROL
    AC1[Building Info] --> AC2[Doors & Readers]
    AC2 --> AC3[Controller]
    AC3 --> AC4[Review]
  end

  subgraph BURGLAR_ALARM
    BA1[Building Info] --> BA2[Sensors]
    BA2 --> BA3[Control Panel]
    BA3 --> BA4[Review]
  end

  subgraph FIRE_PROTECTION
    FP1[Building Info] --> FP2[Suppression Systems]
    FP2 --> FP3[Review]
  end

  subgraph OTHER
    OT1[Building Info] --> OT2[Technical Specs]
    OT2 --> OT3[Review]
  end
```

### Create Survey Form (4-step standalone)

```mermaid
flowchart LR
  S0[Step 0<br/>Company & Project] --> S1[Step 1<br/>Project Name & Systems]
  S1 --> S2[Step 2<br/>Client Info]
  S2 --> S3[Step 3<br/>Location / Map]
  S3 --> SAVE[Save → Project Detail]
```

## AI Estimation Workflow

```mermaid
flowchart TD
  START([User on Estimation page]) --> CHOOSE{Choose mode}

  CHOOSE -->|"AI ESTIMATE SCAN"| SIM["Simulation mode<br/>(no floor plan needed)"]
  SIM --> STEPS["Runs 5-step animation<br/>Building type + floor count"]
  STEPS --> GEN[Generates manpower,<br/>BOQ items, fees, constraints]

  CHOOSE -->|"ANALYZE N FLOOR PLANS"| UPLOAD["Upload images<br/>(JPG/PNG/PDF, multi-file)"]
  UPLOAD --> VALIDATE{Valid images?}
  VALIDATE -->|no| ERROR[Show error]
  ERROR --> UPLOAD
  VALIDATE -->|yes| PHASE1

  subgraph PHASE1["Phase 1 — Visual Analysis"]
    V1["Convert to base64"]
    V2["Send to Groq API<br/>(qwen/qwen3.6-27b)"]
    V3["Extract: floor count, area,<br/>room types, doors, ceiling,<br/>perimeter, observations"]
    V1 --> V2 --> V3
  end

  PHASE1 --> PHASE2

  subgraph PHASE2["Phase 2 — BOQ Generation"]
    B1["Pass analysis data to<br/>(llama-3.3-70b-versatile)"]
    B2["Apply SYSTEM_RULES<br/>per survey type"]
    B3["Calculate cable lengths,<br/>manpower, equipment counts"]
    B4["Output JSON: manpower,<br/>consumables, fees, constraints"]
    B1 --> B2 --> B3 --> B4
  end

  PHASE2 --> MERGE[Match consumables<br/>against products.json catalog]
  MERGE --> PRICE[Apply price tier<br/>SRP / Contractor / Dealer]
  PRICE --> TOTAL[Calculate grand total<br/>Materials + Labor + Fees]

  TOTAL --> DONE([Estimation complete])
```

## Data Flow

```mermaid
graph TB
  subgraph Frontend
    App[App.tsx - State Machine]
    Components[UI Components]
  end

  subgraph Services
    DS[DataService - Unified Interface]
    LS[LocalStorageService]
    SS[SupabaseService]
    GQ[geminiFloorPlanService<br/>Groq Vision API]
  end

  subgraph Storage
    LS_KEYS["localStorage<br/>aa2000_projects<br/>aa2000_surveys<br/>aa2000_user<br/>aa2000_groq_key<br/>aa2000_notifications"]
    PROD["products.json<br/>(94,550 items)"]
  end

  App --> Components
  Components --> DS
  DS --> LS
  DS --> SS
  App --> GQ

  LS --> LS_KEYS
  SS --> SUPABASE[Supabase REST API]

  Components --> PROD

  GQ --> GROQ[Groq API<br/>External]
```

## Component Hierarchy

```mermaid
graph TB
  APP["App.tsx<br/>(Screen Router & Global State)"]

  APP --> LOGIN["Login.tsx"]
  APP --> DASH["Dashboard.tsx"]
  APP --> CSF["CreateSurveyForm.tsx"]
  APP --> SETTINGS["Settings.tsx"]

  DASH --> SIDEBAR["Sidebar.tsx"]
  DASH --> HOME["Home.tsx"]
  DASH --> COMPANY["CompanyDetail.tsx"]
  DASH --> CPM["CreateProjectModal.tsx"]
  DASH --> NOTIF_BELL["NotificationBell.tsx"]

  COMPANY --> PROJ_DETAIL["ProjectDetail.tsx"]
  PROJ_DETAIL --> SURVEY_CARD["SurveyCard.tsx"]

  CSF --> MAP["LeafletMap.tsx"]
  CPM --> MAP

  APP --> SURVEY_WIZ["SurveyWizard.tsx"]
  SURVEY_WIZ --> BUILDING["BuildingForm"]
  SURVEY_WIZ --> CAMERA["CameraForm"]
  SURVEY_WIZ --> INFRA["CCTVInfraForm"]
  SURVEY_WIZ --> DETECT["DetectionForm"]
  SURVEY_WIZ --> DOOR["DoorForm"]
  SURVEY_WIZ --> SENSOR["SensorForm"]
  SURVEY_WIZ --> PANEL["PanelForm"]
  SURVEY_WIZ --> CONTROLLER["ControllerForm"]
  SURVEY_WIZ --> SUPPRESS["SuppressionForm"]
  SURVEY_WIZ --> SPECS["SpecsForm"]
  SURVEY_WIZ --> REVIEW["ReviewForm"]

  APP --> EST["EstimationSummary.tsx"]
  APP --> SUMMARY["SurveySummary.tsx"]
