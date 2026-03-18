# AS Moloobhoy Marine Services - PRD

## Original Problem Statement
Build a dual-dashboard web application for AS Moloobhoy, a marine services company in India. Sales Dashboard (light theme) for tracking vessel arrivals and compliance certificates. Operations Dashboard (dark theme) for field engineers managing daily jobs.

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Database**: MongoDB with collections: vessels, jobs, quotes, leads, notifications

## User Personas
1. **Sales Rep**: Opens Sales Dashboard each morning to see arriving vessels, expiring certificates, and prioritize calls
2. **Field Engineer**: Opens Ops Dashboard on phone to see daily jobs ordered by vessel ETA

## Core Requirements
- Two dashboards sharing navigation with Sales | Ops toggle
- Sales: 3-column layout (port filter, vessel tabs, quick actions)
- Ops: 2-panel layout (jobs timeline, vessel feed + cert expiry)
- 7 Indian ports: Mumbai, Kandla, Kochi, Tuticorin, Chennai, Vizag, Mundra
- Service types: LSA, FFA, NAVCOM with certificate expiry tracking
- Theme switching: light (Sales) ↔ dark (Ops)

## What's Been Implemented (March 7, 2026)
- Full backend with 14+ API endpoints (sales vessels/quotes/leads/stats, ops jobs/feed/certificates/stats, notifications)
- Auto-seed with 25 vessels, 26+ jobs, 7+ quotes, 5 leads
- Sales Dashboard: port filter sidebar, 4 tabs, vessel cards with cert expiry bars, actions (Call/Quote/Assign/Note)
- Ops Dashboard: job cards with status management, vessel feed, cert expiry panel, port selector
- Shared navigation with theme toggle, notifications bell
- Toast notifications via sonner
- All data-testid attributes for testing
- Custom fonts: Syne (headings), Instrument Sans (body), JetBrains Mono (data)

### Latest Updates (March 7, 2026 - Fixes Applied)
- **Fix 1**: Manager/Owner dropdowns now show static lists as requested:
  - Managers: Anglo-Eastern, Synergy Marine, Fleet Management Ltd, BSM Mumbai, GE Shipping, SCI India, Tolani Shipping, Essar Shipping
  - Owners: HPCL, Indian Oil, GE Shipping, Essar Shipping, SCI India, Reliance Industries, Adani Ports
- **Fix 2**: Status labels now display in Title Case (e.g., "In Progress" instead of "in_progress")
- **Fix 3**: Vessel type/service consistency - Bulk Carriers & RORO have LSA/FFA only (no NAVCOM), Tankers prioritize FFA
- **Fix 4**: Owner and Manager are always distinct with realistic names (e.g., "Safe Bulkers Inc | Synergy Marine Singapore")
- **Enhancement**: Certificate expiry status filter added - filter vessels by Expired, Critical (<7 days), or Warning (<30 days) status
- **Enhancement**: Currency selector (USD/INR) in navigation bar - quotes display in selected currency with automatic conversion

## Testing Results
- Backend: 100% (20/20 tests for 4 fixes)
- Frontend: 100% (All UI elements display correctly)
- Integration: 100%

## Prioritized Backlog
### P0 (Critical)
- None remaining

### P1 (High)
- Connect to real vessel tracking API (AIS data)
- User authentication and role-based access
- Mobile responsiveness polish for Ops dashboard

### P2 (Medium)
- Calendar view for vessel arrivals
- Engineer assignment workflow with availability
- Quote generation with PDF export
- Job checklist interaction in Ops dashboard
- Real-time WebSocket updates for vessel positions

### P3 (Nice to have)
- Email/SMS notifications for expiring certificates
- Analytics dashboard (conversion rates, revenue tracking)
- Offline mode for field engineers
- Map view with vessel positions

## Next Tasks
1. Connect to real vessel API data source
2. Add user authentication (JWT or Google OAuth)
3. Polish mobile responsiveness for Ops dashboard
4. Add calendar component for arrival scheduling
5. Implement job checklist interactivity
