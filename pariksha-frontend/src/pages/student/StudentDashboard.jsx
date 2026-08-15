import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCheck,
  Award,
  FileText,
  PencilLine,
  CalendarDays,
  Clock,
  ArrowRight,
  TrendingUp,
  TrendingDown as TrendDown,
  BookOpen,
  AlertCircle,
  Trophy,
  Flame,
  Compass,
  Star,
  Target,
  Lock,
  Sparkles,
  Activity,
  CheckCircle2,
  RefreshCw,
  Medal,
  ListChecks,
  ShieldAlert,
} from "lucide-react";
import StudentLayout from "../../components/student/StudentLayout";
import studentService from "../../services/studentService";
import Spinner from "../../components/shared/Spinner";
import Toast from "../../components/shared/Toast";
import "./StudentDashboard.css";

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function getTodayName() {
  return DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getAttendanceStatus(pct) {
  if (pct == null) return { label: "No data", tone: "sdb-badge-neutral" };
  if (pct >= 90)
    return { label: "Excellent Attendance", tone: "sdb-badge-good" };
  if (pct >= 75) return { label: "Good Attendance", tone: "sdb-badge-good" };
  if (pct >= 60) return { label: "Needs Improvement", tone: "sdb-badge-avg" };
  return { label: "Critical — Low Attendance", tone: "sdb-badge-low" };
}

function getMotivationalMessage(attendancePct, overallAvg) {
  if (attendancePct == null && overallAvg == null) {
    return "Let's get your first exam and attendance record in — every journey starts somewhere 🚀";
  }
  if (overallAvg != null && overallAvg >= 85) {
    return "Outstanding work! You're performing among the best in your class 🌟";
  }
  if (attendancePct != null && attendancePct >= 90) {
    return "Keep learning, your consistency is impressive 🚀";
  }
  if (overallAvg != null && overallAvg < 50) {
    return "Every expert was once a beginner — a little more practice will turn this around 💪";
  }
  return "Great progress! Stay consistent and keep pushing forward.";
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins <= 0 ? 1 : mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

function daysUntil(dateStr) {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const days = Math.ceil(diffMs / 86400000);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

// FIX: TimetableResponse gives timeSlotStart/timeSlotEnd as "HH:mm:ss"
// strings (LocalTime serialized). Format them into a readable "8:00 AM"
// style label instead of the non-existent slot.timeSlot field.
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${suffix}`;
}

// FIX: compares "HH:mm" against timeSlotStart/timeSlotEnd directly,
// instead of trying to split a nonexistent "timeSlot" string on "-".
function isSlotCurrent(slot) {
  if (!slot.timeSlotStart || !slot.timeSlotEnd) return false;
  const currentTimeStr = new Date().toTimeString().slice(0, 5);
  const start = slot.timeSlotStart.slice(0, 5);
  const end = slot.timeSlotEnd.slice(0, 5);
  return currentTimeStr >= start && currentTimeStr <= end;
}

// ─────────────────────────────────────────────
//  Loading skeleton
// ─────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="sdb-bento-grid">
      <div className="sdb-bento-card sdb-span-2 sdb-skel sdb-skel-hero" />
      <div className="sdb-bento-card sdb-skel sdb-skel-hero" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="sdb-bento-card sdb-skel">
          <div className="sdb-skel-icon" />
          <div className="sdb-skel-lines">
            <div className="sdb-skel-line sdb-skel-line-lg" />
            <div className="sdb-skel-line sdb-skel-line-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
//  Main component
// ─────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [profile, setProfile] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [marksSummary, setMarksSummary] = useState([]);
  const [timetable, setTimetable] = useState([]);
  const [examHistory, setExamHistory] = useState([]);
  const [papers, setPapers] = useState([]);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // New backend-sourced data — null/[] until the endpoint exists & responds
  const [streak, setStreak] = useState(null);
  const [rank, setRank] = useState(null);
  const [deadlines, setDeadlines] = useState([]);
  const [aiInsights, setAiInsights] = useState(null);
  const [achievementsData, setAchievementsData] = useState(null);
  const [attendancePrediction, setAttendancePrediction] = useState(null);

  const loadDashboard = useCallback(async (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    const [
      profRes,
      attRes,
      marksRes,
      ttRes,
      histRes,
      papersRes,
      streakRes,
      rankRes,
      deadlinesRes,
      aiRes,
      achieveRes,
      predictRes,
    ] = await Promise.allSettled([
      studentService.getProfile(),
      studentService.getSummary(),
      studentService.getMarksSummary(),
      studentService.getTimetable(),
      studentService.getHistory(),
      studentService.getMyPapers(),
      studentService.getStreak?.() ?? Promise.reject(),
      studentService.getRank?.() ?? Promise.reject(),
      studentService.getDeadlines?.() ?? Promise.reject(),
      studentService.getAiInsights?.() ?? Promise.reject(),
      studentService.getAchievements?.() ?? Promise.reject(),
      studentService.getAttendancePrediction?.() ?? Promise.reject(),
    ]);

    if (profRes.status === "fulfilled") setProfile(profRes.value.data.data);
    if (attRes.status === "fulfilled")
      setAttendanceSummary(attRes.value.data.data);
    if (marksRes.status === "fulfilled")
      setMarksSummary(marksRes.value.data.data || []);
    if (ttRes.status === "fulfilled") setTimetable(ttRes.value.data.data || []);
    if (histRes.status === "fulfilled")
      setExamHistory(histRes.value.data.data || []);
    if (papersRes.status === "fulfilled")
      setPapers(papersRes.value.data.data || []);

    if (streakRes.status === "fulfilled") setStreak(streakRes.value.data.data);
    if (rankRes.status === "fulfilled") setRank(rankRes.value.data.data);
    if (deadlinesRes.status === "fulfilled")
      setDeadlines(deadlinesRes.value.data.data?.deadlines || []);
    if (aiRes.status === "fulfilled") setAiInsights(aiRes.value.data.data);
    if (achieveRes.status === "fulfilled")
      setAchievementsData(achieveRes.value.data.data?.achievements || null);
    if (predictRes.status === "fulfilled")
      setAttendancePrediction(predictRes.value.data.data);

    const coreResults = [profRes, attRes, marksRes, ttRes, histRes, papersRes];
    const allFailed = coreResults.every((r) => r.status === "rejected");
    const someFailed = coreResults.some((r) => r.status === "rejected");

    if (allFailed) {
      const firstReason = coreResults.find(
        (r) => r.status === "rejected",
      )?.reason;
      const isNetworkIssue = !firstReason?.response;
      setError(
        isNetworkIssue
          ? "Connection problem. Check your internet and retry."
          : "Unable to fetch dashboard data.",
      );
      if (isRetry) {
        setToast({
          type: "error",
          message: isNetworkIssue
            ? "Connection problem. Check your internet and retry."
            : "Unable to fetch dashboard data.",
        });
      }
    } else if (isRetry) {
      setToast({
        type: "success",
        message: "Dashboard refreshed successfully 🚀",
      });
    } else if (someFailed) {
      setToast({
        type: "warning",
        message: "Some insights are temporarily unavailable.",
      });
    }

    setLoading(false);
    setRetrying(false);
  }, []);

  useEffect(() => {
    loadDashboard(false);
  }, [loadDashboard]);

  // ── Derived stats ──
  const attendancePct = attendanceSummary?.attendancePercentage ?? null;

  // FIX: MarksSummaryResponse field is "percentage", not "averagePercentage"
  const overallAvg = (() => {
    if (!marksSummary.length) return null;
    const validEntries = marksSummary.filter((m) => m.percentage != null);
    if (!validEntries.length) return null;
    const sum = validEntries.reduce((acc, m) => acc + m.percentage, 0);
    return Math.round(sum / validEntries.length);
  })();

  const examsCompleted = examHistory.length;
  const attemptedPaperIds = new Set(
    examHistory.map((e) => e.paperId ?? e.questionPaperId).filter(Boolean),
  );
  const upcomingPapers = papers.filter((p) => !attemptedPaperIds.has(p.id));
  const nextExam = upcomingPapers[0] || null;

  const todayName = getTodayName();
  // FIX: sort by timeSlotStart (real field) instead of the non-existent timeSlot
  const todaySlots = timetable
    .filter((t) => (t.day || t.dayOfWeek || "").toUpperCase() === todayName)
    .sort((a, b) =>
      (a.timeSlotStart || "").localeCompare(b.timeSlotStart || ""),
    );

  // FIX: MarksSummaryResponse has no date/examType field to sort recency by,
  // so we sort alphabetically by subject for a stable, predictable order.
  const recentMarks = [...marksSummary]
    .sort((a, b) => (a.subject || "").localeCompare(b.subject || ""))
    .slice(0, 5);

  // ── Achievements — backend-sourced if available, otherwise frontend fallback ──
  const frontendAchievements = [
    {
      key: "top-performer",
      icon: Trophy,
      title: "Top Performer",
      desc: "Score above 90% overall average",
      earned: overallAvg != null && overallAvg >= 90,
    },
    {
      key: "consistency",
      icon: Flame,
      title: "Consistency Champion",
      desc: "Maintain attendance above 90%",
      earned: attendancePct != null && attendancePct >= 90,
    },
    {
      key: "explorer",
      icon: Compass,
      title: "Knowledge Explorer",
      desc: "Complete 3 or more exams",
      earned: examsCompleted >= 3,
    },
    {
      key: "exam-master",
      icon: Target,
      title: "Exam Master",
      desc: "Complete every available exam",
      earned: examsCompleted > 0 && upcomingPapers.length === 0,
    },
    {
      key: "improvement",
      icon: Star,
      title: "Improvement Star",
      desc: "Unlocks once your performance history is tracked",
      earned: false,
    },
  ];
  const achievements = achievementsData
    ? achievementsData.map((a, i) => ({
        key: a.title ?? i,
        icon: Trophy,
        title: a.title,
        desc: a.description,
        earned: a.unlocked,
        date: a.date,
      }))
    : frontendAchievements;
  const earnedCount = achievements.filter((a) => a.earned).length;

  // FIX: rank by "percentage", not "averagePercentage"
  const subjectsRanked = [...marksSummary]
    .filter((m) => m.percentage != null)
    .sort((a, b) => b.percentage - a.percentage);
  const strongestSubject = subjectsRanked[0] || null;
  const weakestSubject =
    subjectsRanked.length > 1
      ? subjectsRanked[subjectsRanked.length - 1]
      : null;

  const aiStrong = aiInsights?.strongSubjects?.length
    ? aiInsights.strongSubjects.join(", ")
    : strongestSubject?.subject;
  const aiWeak = aiInsights?.weakSubjects?.length
    ? aiInsights.weakSubjects.join(", ")
    : weakestSubject?.subject;
  const aiRecommendation =
    aiInsights?.recommendation ||
    (weakestSubject
      ? `Practice 10 extra questions daily in ${weakestSubject.subject} to see steady improvement.`
      : null);

  const activityFeed = [
    ...examHistory.map((e) => ({
      id: `exam-${e.id}`,
      label: `Completed ${e.subject || e.paperTitle || "an"} Exam`,
      date: e.submittedAt || e.completedAt || e.createdAt || null,
    })),
    ...(achievementsData || [])
      .filter((a) => a.unlocked && a.date)
      .map((a) => ({
        id: `ach-${a.title}`,
        label: `Achievement unlocked: ${a.title}`,
        date: a.date,
      })),
  ]
    .filter((e) => e.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const attendanceStatus = getAttendanceStatus(attendancePct);
  const displayName = profile?.firstName || "Student";
  const classLine = profile?.className
    ? `Class ${profile.className}${profile.section ? " Section " + profile.section : ""}`
    : null;

  const rankImproved =
    rank && rank.previousRank != null
      ? rank.previousRank - rank.currentRank
      : null;

  const predictionTone =
    {
      SAFE: "sdb-badge-good",
      WARNING: "sdb-badge-avg",
      CRITICAL: "sdb-badge-low",
    }[attendancePrediction?.status] || "sdb-badge-neutral";

  return (
    <StudentLayout title="Dashboard">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="sdb-error-state">
          <div className="sdb-error-icon">
            <AlertCircle size={32} strokeWidth={1.6} />
          </div>
          <h3>Unable to load your academic insights 😔</h3>
          <p>We couldn't load your dashboard data.</p>
          <span className="sdb-error-sub">
            Your data is safe. Please retry.
          </span>
          <button
            className="sdb-retry-btn"
            onClick={() => loadDashboard(true)}
            disabled={retrying}>
            {retrying ? (
              <Spinner size="small" color="#fff" />
            ) : (
              <>
                <RefreshCw size={15} strokeWidth={2.2} /> Retry
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="sdb-bento-grid">
          {/* ── ROW 1: HERO + AI MENTOR ── */}
          <div className="sdb-bento-card sdb-span-2 sdb-hero-card">
            <div className="sdb-hero-text">
              <h1 className="sdb-hero-title">
                {getGreeting()}, {displayName} 👋
              </h1>
              <p className="sdb-hero-sub">
                Your academic journey overview
                {classLine ? ` · ${classLine}` : ""}
              </p>
              <p className="sdb-hero-motivation">
                {getMotivationalMessage(attendancePct, overallAvg)}
              </p>
            </div>
            <div className="sdb-hero-side">
              <div className="sdb-hero-ring">
                <svg viewBox="0 0 80 80" className="sdb-hero-ring-svg">
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="sdb-hero-ring-track"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    className="sdb-hero-ring-fill"
                    style={{
                      strokeDasharray: 2 * Math.PI * 34,
                      strokeDashoffset:
                        2 * Math.PI * 34 * (1 - (overallAvg ?? 0) / 100),
                    }}
                  />
                </svg>
                <span className="sdb-hero-ring-value">
                  {overallAvg != null ? `${overallAvg}%` : "–"}
                </span>
              </div>
              <button
                className="sdb-hero-cta"
                onClick={() => navigate("/student/marks")}>
                View Performance <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="sdb-bento-card sdb-ai-card">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <Sparkles size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">✨ AI Learning Mentor</h2>
              </div>
            </div>
            {!aiStrong && !aiWeak ? (
              <div className="sdb-empty">
                <Sparkles size={26} strokeWidth={1.6} />
                <p>Complete a few exams to unlock personalized insights</p>
                <span className="sdb-empty-sub">
                  Your AI recommendations will appear here
                </span>
              </div>
            ) : (
              <div className="sdb-ai-body">
                <ul className="sdb-ai-list">
                  {aiStrong && (
                    <li className="sdb-ai-item sdb-ai-strong">
                      <CheckCircle2 size={15} strokeWidth={2} /> Strong in{" "}
                      {aiStrong}
                    </li>
                  )}
                  {aiWeak && (
                    <li className="sdb-ai-item sdb-ai-weak">
                      <AlertCircle size={15} strokeWidth={2} /> Improve {aiWeak}
                    </li>
                  )}
                </ul>
                {aiRecommendation && (
                  <div className="sdb-ai-recommend">
                    <span className="sdb-ai-recommend-label">
                      Recommendation
                    </span>
                    <p>{aiRecommendation}</p>
                  </div>
                )}
                {aiInsights?.studyPlan && (
                  <div className="sdb-ai-recommend">
                    <span className="sdb-ai-recommend-label">Study Plan</span>
                    <p>{aiInsights.studyPlan}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── ROW 2: STREAK + RANK + ATTENDANCE PREDICTION ── */}
          <div className="sdb-bento-card sdb-kpi-card">
            <div className="sdb-kpi-top">
              <div className="sdb-stat-icon sdb-icon-orange">
                <Flame size={22} strokeWidth={2} />
              </div>
            </div>
            {streak ? (
              <>
                <span className="sdb-kpi-value">
                  {streak.currentStreak} Day
                  {streak.currentStreak === 1 ? "" : "s"}
                </span>
                <span className="sdb-kpi-label">Learning Streak</span>
                <div className="sdb-kpi-next">
                  <span className="sdb-kpi-next-label">Longest streak:</span>
                  <span className="sdb-kpi-next-value">
                    {streak.longestStreak} days
                  </span>
                </div>
              </>
            ) : (
              <div className="sdb-empty sdb-empty-compact">
                <p>Streak tracking coming soon</p>
                <span className="sdb-empty-sub">
                  Requires GET /api/student/streak
                </span>
              </div>
            )}
          </div>

          <div className="sdb-bento-card sdb-kpi-card">
            <div className="sdb-kpi-top">
              <div className="sdb-stat-icon sdb-icon-blue">
                <Medal size={22} strokeWidth={2} />
              </div>
            </div>
            {rank ? (
              <>
                <span className="sdb-kpi-value">
                  #{rank.currentRank} / {rank.totalStudents}
                </span>
                <span className="sdb-kpi-label">Class Rank</span>
                {rankImproved != null && (
                  <span
                    className={`sdb-badge ${rankImproved > 0 ? "sdb-badge-good" : rankImproved < 0 ? "sdb-badge-low" : "sdb-badge-neutral"}`}>
                    {rankImproved > 0
                      ? `Up ${rankImproved}`
                      : rankImproved < 0
                        ? `Down ${Math.abs(rankImproved)}`
                        : "No change"}
                  </span>
                )}
              </>
            ) : (
              <div className="sdb-empty sdb-empty-compact">
                <p>Rank data coming soon</p>
                <span className="sdb-empty-sub">
                  Requires GET /api/student/rank
                </span>
              </div>
            )}
          </div>

          <div className="sdb-bento-card sdb-kpi-card">
            <div className="sdb-kpi-top">
              <div className="sdb-stat-icon sdb-icon-purple">
                <ShieldAlert size={22} strokeWidth={2} />
              </div>
            </div>
            {attendancePrediction ? (
              <>
                <span className="sdb-kpi-value">
                  {attendancePrediction.predictedSemesterPercentage}%
                </span>
                <span className="sdb-kpi-label">
                  Predicted Semester Attendance
                </span>
                <span className={`sdb-badge ${predictionTone}`}>
                  {attendancePrediction.status}
                </span>
              </>
            ) : (
              <div className="sdb-empty sdb-empty-compact">
                <p>Prediction coming soon</p>
                <span className="sdb-empty-sub">
                  Requires GET /api/student/attendance/prediction
                </span>
              </div>
            )}
          </div>

          {/* ── ROW 3: PERFORMANCE ANALYTICS + ATTENDANCE + EXAM KPI ── */}
          {subjectsRanked.length > 0 && (
            <div className="sdb-bento-card sdb-span-2">
              <div className="sdb-card-header">
                <div className="sdb-card-title-wrap">
                  <Activity size={17} strokeWidth={2} />
                  <h2 className="sdb-card-title">Performance Analytics</h2>
                </div>
                <button
                  className="sdb-card-link"
                  onClick={() => navigate("/student/marks")}>
                  View all <ArrowRight size={13} strokeWidth={2.2} />
                </button>
              </div>
              <div className="sdb-analytics-list">
                {subjectsRanked.map((s, i) => (
                  <div key={i} className="sdb-analytics-row">
                    <span className="sdb-analytics-label">{s.subject}</span>
                    <div className="sdb-analytics-track">
                      <div
                        className={`sdb-analytics-bar ${
                          s.percentage >= 75
                            ? "sdb-progress-green"
                            : s.percentage >= 40
                              ? "sdb-progress-amber"
                              : "sdb-progress-red"
                        }`}
                        style={{ width: `${s.percentage}%` }}
                      />
                    </div>
                    <span className="sdb-analytics-value">{s.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            className="sdb-bento-card sdb-kpi-card"
            onClick={() => navigate("/student/attendance")}>
            <div className="sdb-kpi-top">
              <div className="sdb-stat-icon sdb-icon-green">
                <ClipboardCheck size={22} strokeWidth={2} />
              </div>
            </div>
            <span className="sdb-kpi-value">
              {attendancePct != null ? `${attendancePct}%` : "–"}
            </span>
            <span className="sdb-kpi-label">Attendance</span>
            <div className="sdb-progress-track">
              <div
                className="sdb-progress-bar sdb-progress-green"
                style={{ width: `${attendancePct ?? 0}%` }}
              />
            </div>
            <span className={`sdb-badge ${attendanceStatus.tone}`}>
              {attendanceStatus.label}
            </span>
          </button>

          {/* ── ROW 4: UPCOMING DEADLINES + EXAM KPI ── */}
          <div className="sdb-bento-card sdb-span-2">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <ListChecks size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Upcoming Deadlines</h2>
              </div>
            </div>
            {deadlines.length === 0 ? (
              <div className="sdb-empty">
                <ListChecks size={26} strokeWidth={1.6} />
                <p>No upcoming deadlines</p>
                <span className="sdb-empty-sub">
                  Exams, assignments, and events will appear here (requires GET
                  /api/student/deadlines)
                </span>
              </div>
            ) : (
              <div className="sdb-timetable-list">
                {[...deadlines]
                  .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                  .map((d) => (
                    <div key={d.id} className="sdb-timetable-item">
                      <div className="sdb-timetable-time">
                        {daysUntil(d.dueDate)}
                      </div>
                      <div className="sdb-timetable-body">
                        <div className="sdb-timetable-subject">{d.title}</div>
                        <div className="sdb-timetable-meta">
                          <span>{d.type}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <button
            className="sdb-bento-card sdb-kpi-card"
            onClick={() => navigate("/student/exams")}>
            <div className="sdb-kpi-top">
              <div className="sdb-stat-icon sdb-icon-purple">
                <PencilLine size={22} strokeWidth={2} />
              </div>
            </div>
            <span className="sdb-kpi-value">{upcomingPapers.length}</span>
            <span className="sdb-kpi-label">Upcoming Exams</span>
            {nextExam ? (
              <div className="sdb-kpi-next">
                <span className="sdb-kpi-next-label">Next:</span>
                <span className="sdb-kpi-next-value">
                  {nextExam.title || nextExam.subject || "Untitled Paper"}
                </span>
                <span className="sdb-badge sdb-badge-good">
                  Ready to attempt
                </span>
              </div>
            ) : (
              <span className="sdb-badge sdb-badge-neutral">All caught up</span>
            )}
          </button>

          {/* ── ROW 5: TIMETABLE + ACTIVITY ── */}
          <div className="sdb-bento-card sdb-span-2">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <CalendarDays size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Today's Timetable</h2>
              </div>
              <button
                className="sdb-card-link"
                onClick={() => navigate("/student/timetable")}>
                View all <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            </div>
            {todaySlots.length === 0 ? (
              <div className="sdb-empty">
                <Clock size={26} strokeWidth={1.6} />
                <p>No classes scheduled for today</p>
                <span className="sdb-empty-sub">
                  Your timetable will appear here
                </span>
              </div>
            ) : (
              <div className="sdb-timetable-list">
                {todaySlots.map((slot, i) => {
                  const current = isSlotCurrent(slot);
                  return (
                    <div
                      key={slot.id ?? i}
                      className={`sdb-timetable-item${current ? " sdb-timetable-current" : ""}`}>
                      <div className="sdb-timetable-time">
                        <Clock size={12} strokeWidth={2} />
                        {formatTime(slot.timeSlotStart)} –{" "}
                        {formatTime(slot.timeSlotEnd)}
                      </div>
                      <div className="sdb-timetable-body">
                        <div className="sdb-timetable-subject">
                          {slot.subject}
                          {current && (
                            <span className="sdb-live-badge">
                              <span className="sdb-live-dot" /> Currently
                              Running
                            </span>
                          )}
                        </div>
                        <div className="sdb-timetable-meta">
                          {slot.teacherName && <span>{slot.teacherName}</span>}
                          {slot.roomNumber && (
                            <span>Room {slot.roomNumber}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="sdb-bento-card">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <Activity size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Recent Activity</h2>
              </div>
            </div>
            {activityFeed.length === 0 ? (
              <div className="sdb-empty">
                <Activity size={26} strokeWidth={1.6} />
                <p>No recent activity yet</p>
                <span className="sdb-empty-sub">
                  Your activity timeline will appear here
                </span>
              </div>
            ) : (
              <div className="sdb-timeline">
                {activityFeed.map((item, i) => (
                  <div key={item.id} className="sdb-timeline-item">
                    <div className="sdb-timeline-marker">
                      <span className="sdb-timeline-dot" />
                      {i !== activityFeed.length - 1 && (
                        <span className="sdb-timeline-line" />
                      )}
                    </div>
                    <div className="sdb-timeline-body">
                      <span className="sdb-timeline-label">{item.label}</span>
                      <span className="sdb-timeline-time">
                        {timeAgo(item.date)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 6: RECENT PERFORMANCE ── */}
          <div className="sdb-bento-card sdb-span-3">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <TrendingUp size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Recent Performance</h2>
              </div>
              <button
                className="sdb-card-link"
                onClick={() => navigate("/student/marks")}>
                View all <ArrowRight size={13} strokeWidth={2.2} />
              </button>
            </div>
            {recentMarks.length === 0 ? (
              <div className="sdb-empty">
                <Award size={26} strokeWidth={1.6} />
                <p>No marks recorded yet</p>
                <span className="sdb-empty-sub">
                  Your exam results will appear here
                </span>
              </div>
            ) : (
              <div className="sdb-marks-list">
                {recentMarks.map((m, i) => (
                  <div key={m.id ?? i} className="sdb-marks-item">
                    <div className="sdb-marks-subject-wrap">
                      <span className="sdb-marks-subject">{m.subject}</span>
                      {/* FIX: examType doesn't exist on MarksSummaryResponse —
                          show grade + exam count instead, both real fields */}
                      <span className="sdb-marks-exam">
                        Grade {m.grade} · {m.examsCount} exam
                        {m.examsCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <span
                      className={`sdb-marks-pct ${
                        m.percentage >= 75
                          ? "sdb-marks-good"
                          : m.percentage >= 40
                            ? "sdb-marks-avg"
                            : "sdb-marks-low"
                      }`}>
                      {m.percentage != null ? `${m.percentage}%` : "–"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── ROW 7: ACHIEVEMENTS ── */}
          <div
            className="sdb-bento-card sdb-span-3 sdb-achievements-card"
            id="sdb-achievements-section">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <Trophy size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Achievements</h2>
              </div>
              <span className="sdb-achieve-count">
                {earnedCount}/{achievements.length} badges unlocked
              </span>
            </div>
            <div className="sdb-achievements-grid">
              {achievements.map((a) => (
                <div
                  key={a.key}
                  className={`sdb-achievement-card${a.earned ? " sdb-achievement-earned" : " sdb-achievement-locked"}`}>
                  <div className="sdb-achievement-icon">
                    {a.earned ? (
                      <a.icon size={22} strokeWidth={1.8} />
                    ) : (
                      <Lock size={18} strokeWidth={1.8} />
                    )}
                  </div>
                  <span className="sdb-achievement-title">{a.title}</span>
                  <span className="sdb-achievement-desc">{a.desc}</span>
                  <span className="sdb-achievement-status">
                    {a.earned
                      ? a.date
                        ? `Unlocked · ${new Date(a.date).toLocaleDateString()}`
                        : "Unlocked"
                      : "Locked"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── ROW 8: QUICK ACTIONS ── */}
          <div className="sdb-bento-card sdb-span-3 sdb-quick-links-card">
            <div className="sdb-card-header">
              <div className="sdb-card-title-wrap">
                <BookOpen size={17} strokeWidth={2} />
                <h2 className="sdb-card-title">Quick Actions</h2>
              </div>
            </div>
            <div className="sdb-quick-links-grid">
              <button
                className="sdb-quick-link"
                onClick={() => navigate("/student/exams")}>
                <div className="sdb-quick-link-icon sdb-icon-purple">
                  <PencilLine size={20} strokeWidth={1.8} />
                </div>
                <span>Attempt Exam</span>
              </button>
              <button
                className="sdb-quick-link"
                onClick={() => navigate("/student/papers")}>
                <div className="sdb-quick-link-icon sdb-icon-blue">
                  <FileText size={20} strokeWidth={1.8} />
                </div>
                <span>Download Papers</span>
              </button>
              <button
                className="sdb-quick-link"
                onClick={() => navigate("/student/marks")}>
                <div className="sdb-quick-link-icon sdb-icon-green">
                  <TrendDown size={20} strokeWidth={1.8} />
                </div>
                <span>View Results</span>
              </button>
              <button
                className="sdb-quick-link"
                onClick={() => navigate("/student/attendance")}>
                <div className="sdb-quick-link-icon sdb-icon-green">
                  <ClipboardCheck size={20} strokeWidth={1.8} />
                </div>
                <span>Attendance</span>
              </button>
              <button
                className="sdb-quick-link"
                onClick={() =>
                  document
                    .getElementById("sdb-achievements-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }>
                <div className="sdb-quick-link-icon sdb-icon-orange">
                  <Trophy size={20} strokeWidth={1.8} />
                </div>
                <span>Achievements</span>
              </button>
              <button
                className="sdb-quick-link"
                onClick={() => navigate("/student/profile")}>
                <div className="sdb-quick-link-icon sdb-icon-purple">
                  <Award size={20} strokeWidth={1.8} />
                </div>
                <span>My Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
