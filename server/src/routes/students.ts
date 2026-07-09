import { Router, Request, Response } from 'express';
import { getDb } from '../db';
import crypto from 'crypto';

const router = Router();

// Helper to convert date to local YYYY-MM-DD
function getLocalDateString(epochMs: number): string {
  const date = new Date(epochMs);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Helper to recalculate and update achievements progress for a student
function updateAchievements(db: any, studentId: string) {
  const nowStr = new Date().toISOString();

  // 1. Fetch student info
  const student = db.prepare('SELECT total_coins AS totalCoins, current_streak AS currentStreak, daily_goal AS dailyGoal FROM students WHERE id = ?').get(studentId) as any;
  if (!student) return;

  const totalCoins = student.totalCoins;
  const currentStreak = student.currentStreak;
  const dailyGoal = student.dailyGoal;

  // 2. Fetch completed sessions
  const sessions = db.prepare(`
    SELECT started_at FROM sessions
    WHERE student_id = ? AND status = 'completed'
    ORDER BY started_at ASC
  `).all(studentId) as any[];

  const deepFocusCount = db.prepare(`
    SELECT COUNT(*) as count FROM sessions
    WHERE student_id = ? AND status = 'completed' AND type = 'deep_focus'
  `).get(studentId).count;

  const totalSessions = sessions.length;

  // 3. Count Early Bird and Night Owl sessions
  let earlyBirdCount = 0;
  let nightOwlCount = 0;
  const sessionDates: string[] = [];

  for (const s of sessions) {
    const d = new Date(s.started_at);
    const hour = d.getHours();
    if (hour < 9) earlyBirdCount++;
    if (hour >= 21) nightOwlCount++;

    // local date YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    sessionDates.push(`${yyyy}-${mm}-${dd}`);
  }

  // 4. Calculate perfectionist streak (consecutive days with sessions >= dailyGoal)
  const sessionsPerDayMap: { [date: string]: number } = {};
  for (const dateStr of sessionDates) {
    sessionsPerDayMap[dateStr] = (sessionsPerDayMap[dateStr] || 0) + 1;
  }

  let perfectionistStreak = 0;
  const uniqueDates = Object.keys(sessionsPerDayMap).sort();
  if (uniqueDates.length > 0) {
    let prevDate: Date | null = null;
    let currentStreakCount = 0;
    let maxStreakCount = 0;

    for (const dateStr of uniqueDates) {
      const curDate = new Date(dateStr);
      const metGoal = sessionsPerDayMap[dateStr] >= dailyGoal;

      if (metGoal) {
        if (prevDate === null) {
          currentStreakCount = 1;
        } else {
          const diffTime = Math.abs(curDate.getTime() - prevDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            currentStreakCount++;
          } else {
            currentStreakCount = 1;
          }
        }
        maxStreakCount = Math.max(maxStreakCount, currentStreakCount);
        prevDate = curDate;
      } else {
        currentStreakCount = 0;
        prevDate = null;
      }
    }
    perfectionistStreak = maxStreakCount;
  }

  // 5. Calculate Week Warrior sessions (sessions in current week)
  const nowDate = new Date();
  const dayOfWeek = nowDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + diffToMonday).getTime();
  
  const sessionsThisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM sessions
    WHERE student_id = ? AND status = 'completed' AND started_at >= ?
  `).get(studentId, startOfWeek).count;

  // 6. Define progress and target details
  const achievements = [
    { id: 'ach_01', current: totalSessions, target: 1 },
    { id: 'ach_02', current: sessionsThisWeek, target: 10 },
    { id: 'ach_03', current: totalCoins, target: 100 },
    { id: 'ach_04', current: deepFocusCount, target: 10 },
    { id: 'ach_05', current: earlyBirdCount, target: 5 },
    { id: 'ach_06', current: currentStreak, target: 30 },
    { id: 'ach_07', current: totalCoins, target: 1000 },
    { id: 'ach_08', current: totalSessions, target: 50 },
    { id: 'ach_09', current: nightOwlCount, target: 5 },
    { id: 'ach_10', current: perfectionistStreak, target: 7 },
    { id: 'ach_11', current: 0, target: 3 }, // Invite friends (static)
  ];

  let unlockedCount = 0;

  for (const ach of achievements) {
    const curVal = Math.min(ach.current, ach.target);
    const progress = Math.round((curVal / ach.target) * 100);
    const isUnlocked = curVal >= ach.target;
    
    if (isUnlocked) {
      unlockedCount++;
    }

    // Update in DB
    const existing = db.prepare('SELECT unlocked_at FROM achievements WHERE id = ? AND student_id = ?').get(ach.id, studentId) as any;
    let unlockedAtVal = existing ? existing.unlocked_at : null;
    if (isUnlocked && !unlockedAtVal) {
      unlockedAtVal = nowStr;
    }

    db.prepare(`
      UPDATE achievements
      SET current = ?, progress = ?, unlocked_at = ?
      WHERE id = ? AND student_id = ?
    `).run(curVal, progress, unlockedAtVal, ach.id, studentId);
  }

  // 7. Update the "Legend" (ach_12) achievement (unlock all other 11 achievements)
  const legendTarget = 11;
  const legendProgress = Math.round((unlockedCount / legendTarget) * 100);
  const legendUnlocked = unlockedCount >= legendTarget;
  const existingLegend = db.prepare('SELECT unlocked_at FROM achievements WHERE id = ? AND student_id = ?').get('ach_12', studentId) as any;
  let legendUnlockedAt = existingLegend ? existingLegend.unlocked_at : null;
  if (legendUnlocked && !legendUnlockedAt) {
    legendUnlockedAt = nowStr;
  }

  db.prepare(`
    UPDATE achievements
    SET current = ?, progress = ?, unlocked_at = ?
    WHERE id = ? AND student_id = ?
  `).run(unlockedCount, legendProgress, legendUnlockedAt, 'ach_12', studentId);
}


// -------------------------------------------------------------
// 1. GET /students/:id
// Returns a single student profile.
// -------------------------------------------------------------
router.get('/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  try {
    const student = db.prepare(`
      SELECT 
        id, 
        name, 
        initials, 
        total_coins AS totalCoins, 
        current_streak AS currentStreak, 
        daily_goal AS dailyGoal, 
        joined_at AS joinedAt
      FROM students
      WHERE id = ?
    `).get(id) as any;

    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    res.json(student);
  } catch (error: any) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// -------------------------------------------------------------
// 2. GET /students/:id/sessions
// Paginated list of sessions, newest first.
// -------------------------------------------------------------
router.get('/:id/sessions', (req: Request, res: Response) => {
  const { id } = req.params;
  const { limit: limitParam, cursor: cursorParam, filter } = req.query;
  const db = getDb();

  try {
    // 1. Validate student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    // 2. Parse limit (default 10, max 50)
    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam as string, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50);
      }
    }

    // 3. Build SQL query conditions
    let queryConditions = 'WHERE student_id = ?';
    const queryParams: any[] = [id];

    // Apply time filters
    if (filter) {
      const now = Date.now();
      let startTime = 0;

      if (filter === 'today') {
        const nowDate = new Date();
        startTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
      } else if (filter === 'week') {
        const nowDate = new Date();
        const dayOfWeek = nowDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        startTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + diffToMonday).getTime();
      } else if (filter === 'month') {
        const nowDate = new Date();
        startTime = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1).getTime();
      }

      if (startTime > 0) {
        queryConditions += ' AND started_at >= ?';
        queryParams.push(startTime);
      }
    }

    // Decode and apply cursor pagination if present
    // The cursor is an opaque base64 string. When decoded, it should be a JSON: { id, startedAt }
    if (cursorParam) {
      try {
        const decoded = JSON.parse(Buffer.from(cursorParam as string, 'base64').toString('utf8'));
        if (decoded.id && decoded.startedAt) {
          queryConditions += ' AND (started_at < ? OR (started_at = ? AND id < ?))';
          queryParams.push(decoded.startedAt, decoded.startedAt, decoded.id);
        }
      } catch (err) {
        return res.status(400).json({ error: 'Invalid cursor format', code: 'BAD_REQUEST' });
      }
    }

    // We fetch limit + 1 items to determine if hasMore is true
    const sessions = db.prepare(`
      SELECT 
        id,
        student_id AS studentId,
        type,
        duration_ms AS durationMs,
        coins,
        status,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM sessions
      ${queryConditions}
      ORDER BY started_at DESC, id DESC
      LIMIT ?
    `).all(...queryParams, limit + 1) as any[];

    const hasMore = sessions.length > limit;
    const paginatedData = hasMore ? sessions.slice(0, limit) : sessions;

    let nextCursor: string | null = null;
    if (hasMore && paginatedData.length > 0) {
      const lastItem = paginatedData[paginatedData.length - 1];
      const cursorObj = { id: lastItem.id, startedAt: lastItem.startedAt };
      nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString('base64');
    }

    res.json({
      data: paginatedData,
      cursor: nextCursor,
      hasMore
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// -------------------------------------------------------------
// 3. GET /students/:id/sessions/:sessionId
// Returns a single session with its timeline breakdown.
// -------------------------------------------------------------
router.get('/:id/sessions/:sessionId', (req: Request, res: Response) => {
  const { id, sessionId } = req.params;
  const db = getDb();

  try {
    // 1. Validate student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    // 2. Fetch the session
    const session = db.prepare(`
      SELECT 
        id,
        student_id AS studentId,
        type,
        duration_ms AS durationMs,
        coins,
        status,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM sessions
      WHERE id = ? AND student_id = ?
    `).get(sessionId, id) as any;

    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'NOT_FOUND'
      });
    }

    // 3. Fetch the timeline breakdown
    const timeline = db.prepare(`
      SELECT 
        type,
        duration_ms AS durationMs,
        started_at AS startedAt
      FROM session_timeline
      WHERE session_id = ?
      ORDER BY id ASC
    `).all(sessionId) as any[];

    // Format output dates to ISO 8601 strings as required by detail spec
    const detailedResponse = {
      id: session.id,
      studentId: session.studentId,
      type: session.type,
      durationMs: session.durationMs,
      coins: session.coins,
      status: session.status,
      startedAt: new Date(session.startedAt).toISOString(),
      completedAt: session.completedAt ? new Date(session.completedAt).toISOString() : null,
      timeline: timeline.map(t => ({
        type: t.type,
        durationMs: t.durationMs,
        startedAt: t.startedAt // Timeline started_at is already stored as ISO text in DB
      }))
    };

    res.json(detailedResponse);
  } catch (error: any) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// -------------------------------------------------------------
// 4. GET /students/:id/stats?period=week
// Returns aggregated stats for the current period (week).
// -------------------------------------------------------------
router.get('/:id/stats', (req: Request, res: Response) => {
  const { id } = req.params;
  const { period } = req.query;
  const db = getDb();

  // Validate period (only 'week' is supported)
  if (period && period !== 'week') {
    return res.status(400).json({
      error: "Only period='week' is supported",
      code: 'BAD_REQUEST'
    });
  }

  try {
    // 1. Fetch student info
    const student = db.prepare(`
      SELECT total_coins AS totalCoins, current_streak AS currentStreak, daily_goal AS dailyGoal
      FROM students
      WHERE id = ?
    `).get(id) as any;

    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    // 2. Compute date boundaries
    const now = Date.now();
    const nowDate = new Date();
    const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();

    // Start of the week (Monday)
    const dayOfWeek = nowDate.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const startOfWeek = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate() + diffToMonday).getTime();

    // 3. Count total sessions this week
    const totalSessionsRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE student_id = ? AND status = 'completed' AND started_at >= ?
    `).get(id, startOfWeek) as any;

    // 4. Count completed today
    const todayCompletedRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE student_id = ? AND status = 'completed' AND started_at >= ?
    `).get(id, startOfToday) as any;

    // 5. Gather daily breakdown count
    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const sessionsPerDay = days.map((dayName, idx) => {
      const dayStart = startOfWeek + idx * 24 * 60 * 60 * 1000;
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;

      const countRow = db.prepare(`
        SELECT COUNT(*) as count
        FROM sessions
        WHERE student_id = ? AND status = 'completed' AND started_at >= ? AND started_at < ?
      `).get(id, dayStart, dayEnd) as any;

      return {
        day: dayName,
        count: countRow ? countRow.count : 0
      };
    });

    res.json({
      totalSessions: totalSessionsRow ? totalSessionsRow.count : 0,
      totalCoins: student.totalCoins,
      streak: student.currentStreak,
      todayCompleted: todayCompletedRow ? todayCompletedRow.count : 0,
      dailyGoal: student.dailyGoal,
      sessionsPerDay
    });
  } catch (error: any) {
    console.error('Error fetching student stats:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// -------------------------------------------------------------
// 5. GET /students/:id/achievements
// Returns achievements list for a student.
// -------------------------------------------------------------
router.get('/:id/achievements', (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDb();

  try {
    // 1. Validate student exists
    const studentExists = db.prepare('SELECT 1 FROM students WHERE id = ?').get(id);
    if (!studentExists) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    // 2. Fetch achievements
    const achievements = db.prepare(`
      SELECT 
        id, 
        name, 
        description, 
        icon, 
        unlocked_at AS unlockedAt, 
        progress, 
        target, 
        current
      FROM achievements
      WHERE student_id = ?
    `).all(id) as any[];

    res.json(achievements);
  } catch (error: any) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

// -------------------------------------------------------------
// 6. POST /students/:id/sessions
// Creates a new completed session and updates stats.
// -------------------------------------------------------------
router.post('/:id/sessions', (req: Request, res: Response) => {
  const { id } = req.params;
  const { type, durationMs, timeline } = req.body;
  const db = getDb();

  // Input Validation
  if (!type || !durationMs || isNaN(durationMs) || durationMs <= 0) {
    return res.status(400).json({
      error: 'Invalid session details. Require type and durationMs.',
      code: 'BAD_REQUEST'
    });
  }

  if (type !== 'deep_focus' && type !== 'quick_sprint' && type !== 'pomodoro') {
    return res.status(400).json({
      error: 'Invalid session type. Must be deep_focus, quick_sprint, or pomodoro.',
      code: 'BAD_REQUEST'
    });
  }

  try {
    // 1. Fetch student info
    const student = db.prepare(`
      SELECT total_coins AS totalCoins, current_streak AS currentStreak, daily_goal AS dailyGoal, name
      FROM students
      WHERE id = ?
    `).get(id) as any;

    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        code: 'NOT_FOUND'
      });
    }

    const sessionId = `ses_${crypto.randomBytes(4).toString('hex')}`;
    const coinsEarned = Math.floor(durationMs / 30000); // 2 coins per minute
    const startedAtTime = Date.now();
    const completedAtTime = startedAtTime + durationMs;

    // Use transaction to write session, timeline, and update student streak + coins
    const runTransaction = db.transaction(() => {
      // 1. Insert session
      db.prepare(`
        INSERT INTO sessions (id, student_id, type, duration_ms, coins, status, started_at, completed_at)
        VALUES (?, ?, ?, ?, ?, 'completed', ?, ?)
      `).run(sessionId, id, type, durationMs, coinsEarned, startedAtTime, completedAtTime);

      // 2. Insert timeline entries
      if (timeline && Array.isArray(timeline)) {
        const insertTimelineStmt = db.prepare(`
          INSERT INTO session_timeline (session_id, type, duration_ms, started_at)
          VALUES (?, ?, ?, ?)
        `);
        for (const t of timeline) {
          insertTimelineStmt.run(sessionId, t.type, t.durationMs, t.startedAt);
        }
      } else {
        // Create a default timeline if none provided
        db.prepare(`
          INSERT INTO session_timeline (session_id, type, duration_ms, started_at)
          VALUES (?, 'focus', ?, ?)
        `).run(sessionId, durationMs, new Date(startedAtTime).toISOString());
      }

      // 3. Calculate streak updates
      // Get all previous completed session dates (excluding today)
      const todayStr = getLocalDateString(startedAtTime);
      const yesterday = new Date(startedAtTime - 24 * 60 * 60 * 1000);
      const yesterdayStr = getLocalDateString(yesterday.getTime());

      const previousSessions = db.prepare(`
        SELECT started_at FROM sessions
        WHERE student_id = ? AND status = 'completed' AND id != ?
        ORDER BY started_at DESC
      `).all(id, sessionId) as any[];

      let hasToday = false;
      let hasYesterday = false;

      for (const s of previousSessions) {
        const dateStr = getLocalDateString(s.started_at);
        if (dateStr === todayStr) {
          hasToday = true;
        } else if (dateStr === yesterdayStr) {
          hasYesterday = true;
        }
      }

      let newStreak = student.currentStreak;

      if (!hasToday) {
        if (hasYesterday) {
          newStreak += 1;
        } else {
          // No session today and no session yesterday -> streak reset/started
          newStreak = 1;
        }
      }

      const newTotalCoins = student.totalCoins + coinsEarned;

      // 4. Update student profile
      db.prepare(`
        UPDATE students
        SET total_coins = ?, current_streak = ?
        WHERE id = ?
      `).run(newTotalCoins, newStreak, id);

      // 5. Update achievements
      updateAchievements(db, id as string);

      return { newStreak, newTotalCoins };
    });

    const { newStreak, newTotalCoins } = runTransaction();

    // 6. Side effect: check daily goal (3 sessions) for webhook
    const todayStart = new Date();
    todayStart.setHours(0,0,0,0);
    const todayStartEpoch = todayStart.getTime();

    const todayCountRow = db.prepare(`
      SELECT COUNT(*) as count 
      FROM sessions 
      WHERE student_id = ? AND status = 'completed' AND started_at >= ?
    `).get(id, todayStartEpoch) as any;

    const sessionsTodayCount = todayCountRow ? todayCountRow.count : 0;
    const todayStr = getLocalDateString(startedAtTime);

    if (sessionsTodayCount >= student.dailyGoal) {
      // Check if already notified today
      const alreadyNotified = db.prepare(`
        SELECT 1 FROM streak_notifications 
        WHERE student_id = ? AND day = ?
      `).get(id, todayStr);

      if (!alreadyNotified) {
        // Record notification to prevent duplicates
        db.prepare(`
          INSERT INTO streak_notifications (student_id, day, notified_at)
          VALUES (?, ?, ?)
        `).run(id, todayStr, new Date().toISOString());

        console.log(`[Streak Notification] Daily goal reached for student ${student.name} (${id}) on ${todayStr}! Triggering n8n webhook notification...`);
        // Fallback webhook call (if url is set in environment, attempt it asynchronously)
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (webhookUrl) {
          const payload = {
            studentId: id,
            studentName: student.name,
            sessionsToday: sessionsTodayCount,
            streak: newStreak,
            date: todayStr
          };
          fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).catch(err => {
            console.error('Failed to trigger n8n webhook:', err.message);
          });
        }
      }
    }

    // Retrieve details for response
    const sessionDetails = db.prepare(`
      SELECT 
        id,
        student_id AS studentId,
        type,
        duration_ms AS durationMs,
        coins,
        status,
        started_at AS startedAt,
        completed_at AS completedAt
      FROM sessions
      WHERE id = ?
    `).get(sessionId) as any;

    const timelineDetails = db.prepare(`
      SELECT type, duration_ms AS durationMs, started_at AS startedAt
      FROM session_timeline
      WHERE session_id = ?
      ORDER BY id ASC
    `).all(sessionId) as any[];

    res.status(201).json({
      id: sessionDetails.id,
      studentId: sessionDetails.studentId,
      type: sessionDetails.type,
      durationMs: sessionDetails.durationMs,
      coins: sessionDetails.coins,
      status: sessionDetails.status,
      startedAt: new Date(sessionDetails.startedAt).toISOString(),
      completedAt: sessionDetails.completedAt ? new Date(sessionDetails.completedAt).toISOString() : null,
      timeline: timelineDetails
    });
  } catch (error: any) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }
});

export default router;
