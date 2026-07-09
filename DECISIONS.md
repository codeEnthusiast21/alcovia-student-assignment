# Decisions

For each non-obvious choice you made, explain **why** (not what). Honest assessment of tradeoffs matters more than sounding impressive.

## State Management

What approach did you use for data fetching and state? Why that over the alternatives?

- **Approach**: I used local state management using standard React hooks i.e. useState, useEffect, useCallback alongside and promise fetching Promise.all for compound requests.
- **Why**: The Alcovia app has isolated screen scopes: the Dashboard focuses on weekly overview, history tab handles scroll lists, and the focus timer operates as an active timer session. Introducing a global state manager (like Redux or Zustand) would add unnecessary boilerplate and complicate component lifecycles for such small assignment app. Local states with pull-to-refresh ensure that each screen gets up-to-date representation of the SQLite database upon entering.

## API Integration

How did you handle the date format inconsistency between the sessions list (epoch ms) and session detail (ISO string) endpoints? Why that approach?

- **Approach**: Standardized date parsing and rendering.
- **Why**: Keeping epoch milliseconds for listing endpoints speeds up sorting and comparison calculations. Standardizing ISO 8601 strings for details keeps metadata readable. I resolved this by building helpers like formatFullDateTime, formatTimeOnly and formatDateOnly which format date fields to local time strings.

## Pagination

How did you implement cursor-based pagination? What happens when the user scrolls past the last page?

- **Approach**: Used opaque Base64 cursors.
- **Why**: In my implementation, when the user scrolls past the last page, the server returns-- hasMore: false and cursor: null.FlatList listens to this state and automatically stops additional requests, keeping the footer empty of loading indicators and also saving redundant api calls and network resources.

## Edge Cases

What does the app show when the API is down? When there are 0 sessions? When a request takes 10 seconds?

- **API Down**: The app catches network/HTTP exceptions and shows a user centric connection error view using an industrial-standard vector icon. Rather than showing warnings or dangerous-looking alerts, it presents friendly, actionable microcopy urging the user to check their connection and try again, along with a prominent "Retry" CTA button to trigger a reload.
- **0 Sessions**: Shows a custom folder illustration (`📂`) stating "No Sessions Found" with helper copy encouraging the student to start their first focus session.
- **10s Slow Request**: The application uses parallelized fetching and displays custom skeleton outlines immediately upon mount rather than blocking the UI with full-screen loading spinner overlays. Users can still navigate between tabs or cancel out of screens.

## Session Detail

What did you put on this screen and why? What data felt useful vs noise?

- **Approach**: We displayed a overview card listing the session type, total focus duration, and coins gained, followed by a connected vertical timeline of the intervals.
- **Why**: Displaying raw start/stop epochs was visual noise. What is useful is seeing the actual intervals of focused block vs resting rest periods in a timeline format. This gives students a clear, gamified sense of achivements and validates their efforts.

## What's Weak

What is the weakest part of your implementation? If you had 2 more days, what would you fix first?

- **Weakest Part**: Lack of offline client persistence and caching. If a user loses internet connectivity, they cannot view their history or use the Focus Timer.
- **First Fixes**: I would integrate @react-native-async-storage/async-storage or local SQLite databases to store the student's profile, recent history, and cache completed timer sessions offline, syncing them back to the server once the connection is restored.

## What Breaks at Scale

If this app had 10,000 concurrent users hitting your API, what breaks first? What would you change?

- **What Breaks First**: SQLite database locking. SQLite is a file-based database that locks the entire file during write operations. Under 10,000 concurrent users, writes from POST /sessions would queue, timeout, and crash the server with database lock errors.
- **What to Change**: Migrate the Express server to a PostgreSQL cluster. I would also implement Redis caching on the read-heavy stats endpoints `/stats` and `/students/:id` so that we do not hit the database on every screen reload.

---

## (Bonus) Focus Timer

This screen had no design spec at all. How did you decide what to build? What did you intentionally leave out?

- **Decisions**: I built a selection interface offering 3 distinct session styles (Deep Focus, Quick Sprint, Pomodoro) with customized color styling (purple, amber, tomato).
- **Ticking Display**: Features a large digital clock with a custom-engineered SVG progress ring that depletes smoothly as the timer ticks.
- **Skip Hook**: Built a discrete "Fast-Forward (3s remaining)" debug helper so that developers and grading recruiters can skip 25-minute wait times and verify the API save works instantly.
- **Intentionally Omitted**: Custom native background alarms/music, as they require complex Expo native dependencies and notification scheduling configurations which increase project configuration complexity requiring more time.

## (Bonus) Achievements Screen & API

How did you design the Achievements screen and how is achievement progression updated?

- **Visual Theme & Grid**: I designed a 3-column responsive badge layout where unlocked achievements are styled with vibrant, colored circles, checkmark overlays, and solid titles, while locked achievements use a dashed border and specific numeric markers (e.g. `1/5` or `340/1000`) for clear progress context.
- **Dynamic Progression Trigger**: To ensure achievements are functional and live rather than static placeholders, I implemented a dynamic recalculation helper `updateAchievements` on the backend. When a student posts a new session, the backend automatically recalculates:
  * Total completed sessions (`First Steps`, `Marathon`)
  * Weekly completions (`Week Warrior`)
  * Coins earned (`Coin Starter`, `Coin Collector`)
  * Deep Focus type counts (`Focus Master`)
  * Temporal constraints (`Early Bird` before 9 AM, `Night Owl` after 9 PM)
  * Consecutive compliance (`Perfectionist` daily goals met)
  * Meta achievements (`Legend` unlocking all other 11 badges)
- **Interactive Detail Drawer**: Tapping a badge immediately loads full descriptions, dates unlocked, and detailed progress bar metrics inside an elegant, bottom-anchored panel.

## (Bonus) Animations & Polish (B5)

How did you make the app feel native and responsive?

- **Pulsing Skeleton Loaders**: Implemented hardware-accelerated pulsing skeleton loaders (`Animated.loop` with native drivers) on both the Dashboard and History screens. This previews the screen layout and prevents visual layout shifts.
- **Staggered Entry Transitions**: The Dashboard components slide up and fade in using a staggered sequence upon loading completion, creating a premium entry flow.
- **Micro-interactions & Haptics**: Added haptic vibration feedback (`haptic.impactLight()`) on interactive actions like button triggers and list navigation to make the app feel tactile.


