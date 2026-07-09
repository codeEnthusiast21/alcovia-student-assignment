# Alcovia Student App - Submission

This repository contains my submission for the Alcovia Student focus application coding assignment. I have implemented all core requirements and successfully completed **three bonus challenges** (Focus Timer, Achievements Screen, and Animations & Polish).

I designed and built the application screens, API routes, and backend business logic, utilizing AI assistance to optimize UI layouts, refine visual styles, and polish smooth transitions and skeleton animations.

---

## Completed Features & Deliverables

### 1. Mobile App (React Native / Expo Router)
- **Dashboard**: Built with pixel-perfect accuracy following the design specs.
- **History Screen**: Completed with cursor-based pagination, scroll-to-load-more, pull-to-refresh and empty states.
- **Session Detail Screen**: Created a detailed, connected vertical timeline showing focus intervals vs rest intervals, complete with a call-to-action loop to easily restart another session.
- **Splash Screen & Adaptive Icon**: Refined the Android assets so that the logo renders cleanly on a native splash screen without any contrast outlines or borders.

### 2. Backend API (Express + SQLite)
- Designed and built route handlers in TypeScript for:
  - `GET /students/:id`
  - `GET /students/:id/sessions` (supporting cursor-based pagination and horizontal scroll filter pills)
  - `GET /students/:id/sessions/:sessionId`
  - `GET /students/:id/stats`
  - `GET /students/:id/achievements` (unlocked vs locked progress query)
  - `POST /students/:id/sessions` (saves focus sessions, awards coins, and recalculates dynamic achievement progression)

### 3. Bonus Challenges Completed
- **B1. Focus Timer**: Implemented a fully functional timer supporting Deep Focus (25m), Quick Sprint (15m), and Pomodoro (50m) modes. Features a digital timer clock, an SVG progress ring that depletes as time progresses, and a fast-forward debug mode (starts at 3 seconds remaining) for easy grading verification.
- **B2. Achievements Screen**: Designed a responsive grid display. Created a dynamic progression recalculator on the backend that evaluates student achievements in real-time when new focus sessions are posted. Clicking a badge displays its description and progress statistics in a slide-up details drawer.
- **B5. Animations & Polish**:
  - Implemented custom hardware-accelerated **pulsing skeleton loaders** on the Dashboard and History screens to eliminate layout shifts during data loading.
  - Added staggered transition entry animations for dashboard components on load.
  - Integrated tactile haptic feedback on button triggers and navigation actions.

---

## Getting Started

### Prerequisites
Ensure you have Node.js and npm installed.

### Setup and Running

1. **Install Frontend Dependencies:**
   ```bash
   npm install
   ```

2. **Install Backend Dependencies & Seed DB:**
   ```bash
   cd server
   npm install
   npm run seed
   ```

3. **Start the API Server:**
   ```bash
   npm run dev
   ```

4. **Start the Mobile Application:**
   Open a separate terminal in the root directory:
   ```bash
   npx expo start
   ```

---

## Technical and Architectural Decisions
Please refer to the [DECISIONS.md](./DECISIONS.md) file in the root directory for detailed engineering explanations regarding state management, error handling, edge cases, scalability, and bonus challenge implementations.
