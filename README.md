# Clean AA2000 Site Survey

Site survey and estimation platform for electronic security systems. Built with a modern architecture.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 19, TypeScript |
| Build | Vite 5 |
| Styling | Tailwind CSS 3.4 |
| Data | Supabase, localStorage with fallback |

## Architecture

### Core Services
- Unified data layer (Supabase/localStorage)
- Type-safe API client
- Error handling utilities
- Performance caching

### Component Structure
- Auth: Login, Signup, Role-based access
- Dashboard: Project overview
- Projects: Create and manage projects
- Surveys: 7 specialized survey systems
- Estimation: Cost calculations
- Reports: PDF/DOCX generation

## Key Features

✅ Clean Architecture (500-1000 line files)
✅ Full TypeScript coverage
✅ Performance optimized with caching
✅ Offline-first with Supabase fallback
✅ Modular design for future features

## Getting Started

```bash
npm install
npm run dev
```

## Building

```bash
npm run build
npm run lint
```

## File Structure

```
src/
├── components/           # React components
│   ├── auth/           # Authentication
│   ├── dashboard/       # Main hub
│   ├── projects/        # Project management
│   ├── surveys/         # Survey systems
│   ├── estimation/      # Cost estimation
│   └── reports/         # Report generation
├── services/             # Core application services
│   ├── api/             # HTTP utilities
│   ├── supabase/        # External data service
│   ├── local-storage/   # Fallback service
│   └── factory/         # Service factory
├── hooks/                # Custom React hooks
├── utils/                # Utilities
├── types/                # TypeScript interfaces
├── constants/            # Configuration
└── config/              # App configuration
```

## Philosophy

- Clarity: Easy to understand and maintain
- Modularity: Small, focused components
- Reliability: Automatic fallback mechanisms
- Type Safety: Full TypeScript coverage
- Performance: Optimized data access and caching
