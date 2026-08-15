import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  Sparkles,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  ChevronDown,
  GraduationCap,
  Brain,
  Zap,
  Globe,
  TrendingUp,
  Lock,
  Bell,
  Menu,
  X,
  Mail,
  ChevronRight,
  Target,
  Layers,
  Database,
  Code2,
  Smartphone,
  Server,
  Key,
  Cloud,
  AlertCircle,
  XCircle,
  CalendarDays,
  LayoutDashboard,
  BookMarked,
  PieChart,
  ScrollText,
  Download,
  UserPlus,
  CheckSquare,
  Rocket,
  MapPin,
} from "lucide-react";
import "./Home.css";

import { FaGithub, FaLinkedin, FaTwitter } from "react-icons/fa";
// ── Data ──
const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#workflow" },
  { label: "Roles", href: "#roles" },
  { label: "Roadmap", href: "#roadmap" },
  { label: "FAQ", href: "#faq" },
];

const FLOATING_WORDS = [
  "Exam",
  "AI",
  "Attendance",
  "Results",
  "Class X",
  "Mathematics",
  "Physics",
  "Question Bank",
  "Analytics",
  "Performance",
  "Timetable",
  "Marks",
  "PDF Export",
  "Chemistry",
  "Biology",
  "Assessment",
];

const TRUST_ITEMS = [
  {
    icon: Brain,
    label: "AI Question Generation",
    desc: "Powered by Google Gemini",
  },
  { icon: Shield, label: "Role Based Access", desc: "Admin, Teacher, Student" },
  {
    icon: CheckSquare,
    label: "Attendance Tracking",
    desc: "Real-time digital attendance",
  },
  {
    icon: CalendarDays,
    label: "Timetable Management",
    desc: "Class & teacher scheduling",
  },
  {
    icon: PieChart,
    label: "Result Analytics",
    desc: "Grade and performance insights",
  },
  { icon: Smartphone, label: "Mobile Friendly", desc: "Works on all devices" },
];

const PROBLEMS = [
  "Manual paper creation every exam",
  "Paper attendance registers",
  "Slow manual answer evaluation",
  "Scattered student data in files",
  "No analytics on performance",
  "Isolated teacher workflows",
];

const SOLUTIONS = [
  "AI generates papers in seconds",
  "Digital attendance with reports",
  "Auto-evaluation for MCQ exams",
  "Centralised student data platform",
  "Real-time performance analytics",
  "Unified teacher & admin dashboard",
];

// Ecosystem nodes with explicit percentage positions for the SVG connector lines
// cx/cy are the CENTER percentages of each pill so lines can connect accurately
const MODULES = [
  {
    icon: Brain,
    label: "AI Generator",
    position: "ai",
    color: "#1D9E75",
    cx: 50,
    cy: 7,
  },
  {
    icon: UserPlus,
    label: "Student Management",
    position: "student",
    color: "#1D9E75",
    cx: 12,
    cy: 30,
  },
  {
    icon: Users,
    label: "Teacher Management",
    position: "teacher",
    color: "#185FA5",
    cx: 88,
    cy: 30,
  },
  {
    icon: CheckSquare,
    label: "Attendance",
    position: "attendance",
    color: "#534AB7",
    cx: 12,
    cy: 55,
  },
  {
    icon: PieChart,
    label: "Result Analytics",
    position: "analytics",
    color: "#E53E3E",
    cx: 88,
    cy: 55,
  },
  {
    icon: CalendarDays,
    label: "Timetable",
    position: "timetable",
    color: "#534AB7",
    cx: 22,
    cy: 78,
  },
  {
    icon: ScrollText,
    label: "Exam Management",
    position: "exam",
    color: "#185FA5",
    cx: 78,
    cy: 78,
  },
  {
    icon: Download,
    label: "PDF Export",
    position: "pdf",
    color: "#D69E2E",
    cx: 50,
    cy: 95,
  },
];

const WORKFLOW_STEPS = [
  {
    num: "01",
    label: "School Setup",
    desc: "Create school, academic session and classes",
    icon: Globe,
    color: "#1D9E75",
  },
  {
    num: "02",
    label: "Teacher Management",
    desc: "Assign teachers and subjects",
    icon: Users,
    color: "#185FA5",
  },
  {
    num: "03",
    label: "Student Enrollment",
    desc: "Manage students and attendance",
    icon: GraduationCap,
    color: "#534AB7",
  },
  {
    num: "04",
    label: "Question Bank",
    desc: "Build reusable question repository",
    icon: BookMarked,
    color: "#D69E2E",
  },
  {
    num: "05",
    label: "AI Paper Generation",
    desc: "Generate papers with Gemini AI",
    icon: Brain,
    color: "#1D9E75",
  },
  {
    num: "06",
    label: "Online Examination",
    desc: "Conduct secure timed exams",
    icon: ScrollText,
    color: "#185FA5",
  },
  {
    num: "07",
    label: "Result Analytics",
    desc: "Evaluate marks and grades",
    icon: PieChart,
    color: "#534AB7",
  },
  {
    num: "08",
    label: "Performance Insights",
    desc: "Track strengths and weaknesses",
    icon: TrendingUp,
    color: "#E53E3E",
  },
];

const TECH_STACK = [
  { icon: Code2, label: "React", sub: "Frontend" },
  { icon: Server, label: "Spring Boot", sub: "Backend API" },
  { icon: Database, label: "MySQL", sub: "Database" },
  { icon: Brain, label: "Gemini AI", sub: "AI Engine" },
  { icon: Key, label: "JWT Auth", sub: "Security" },
  { icon: Cloud, label: "Cloud Ready", sub: "Deployment" },
];

const ROADMAP = [
  {
    status: "done",
    icon: CheckCircle,
    label: "Question Bank",
    desc: "Full CRUD with filters",
  },
  {
    status: "done",
    icon: CheckCircle,
    label: "Exam Management",
    desc: "Timed exams with auto-submit",
  },
  {
    status: "done",
    icon: CheckCircle,
    label: "AI Question Generation",
    desc: "Gemini-powered paper creation",
  },
  {
    status: "done",
    icon: CheckCircle,
    label: "PDF Export",
    desc: "Professional paper + answer key",
  },
  {
    status: "done",
    icon: CheckCircle,
    label: "Attendance Tracking",
    desc: "Digital attendance with reports",
  },
  {
    status: "active",
    icon: Rocket,
    label: "Parent Portal",
    desc: "Parents view child progress",
  },
  {
    status: "active",
    icon: Rocket,
    label: "Mobile App",
    desc: "React Native iOS & Android",
  },
  {
    status: "soon",
    icon: MapPin,
    label: "AI Evaluation",
    desc: "Gemini evaluates long answers",
  },
  {
    status: "soon",
    icon: MapPin,
    label: "WhatsApp Notifications",
    desc: "Alerts to parents & students",
  },
  {
    status: "soon",
    icon: MapPin,
    label: "Automated Report Cards",
    desc: "One-click PDF report generation",
  },
];

const FAQS = [
  {
    q: "What is Pariksha.io?",
    a: "Pariksha.io is an AI-powered school and exam management platform that helps educational institutions manage students, teachers, attendance, timetables, question banks, and AI-generated question papers from a single dashboard.",
  },
  {
    q: "How does the AI question generator work?",
    a: "The AI question generator is powered by Google Gemini. You specify the subject, topic, class level, difficulty, and number of questions. Gemini generates contextual MCQ, Short Answer, Long Answer, True/False, and Fill-in-the-blank questions instantly.",
  },
  {
    q: "Is student data secure?",
    a: "Yes. All data is secured with JWT-based authentication, role-based access control, and encrypted storage. Each role (Admin, Teacher, Student) can only access data relevant to their permissions.",
  },
  {
    q: "Can exams be attempted on mobile devices?",
    a: "Absolutely. Pariksha.io is built mobile-first and works seamlessly on smartphones, tablets, and desktops. Students can attempt exams from any device with a browser.",
  },
  {
    q: "How are long-answer questions evaluated?",
    a: "MCQ, True/False, and Fill-in-the-blank answers are evaluated automatically. Short and Long answer questions are flagged for teacher review, with optional AI-assisted evaluation suggestions from Gemini.",
  },
  {
    q: "Is there a free version available?",
    a: "Pariksha.io is currently in active development. If you'd like early access or to partner with us, reach out through the contact section below.",
  },
];

// ── Hooks ──
function useScrollY() {
  const [scrollY, setScrollY] = useState(0);
  const rafRef = useRef(null);
  useEffect(() => {
    function handle() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        setScrollY(window.scrollY);
        rafRef.current = null;
      });
    }
    window.addEventListener("scroll", handle, { passive: true });
    return () => {
      window.removeEventListener("scroll", handle);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);
  return scrollY;
}

function useInView(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

export default function Home() {
  const navigate = useNavigate();
  const scrollY = useScrollY();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [bentoRef, bentoVis] = useInView();

  useEffect(() => {
    const ids = ["features", "workflow", "roles", "roadmap", "faq"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.top <= 120 && r.bottom >= 120) {
          setActiveNav(`#${id}`);
          break;
        }
      }
    }
  }, [scrollY]);

  function scrollTo(href) {
    setMenuOpen(false);
    const id = href.replace("#", "");
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const p = (speed) => `translate3d(0, ${scrollY * speed}px, 0)`;

  const [trustRef, trustVis] = useInView();
  const [probRef, probVis] = useInView();
  const [modRef, modVis] = useInView();
  const [wfRef, wfVis] = useInView();
  const [rolesRef, rolesVis] = useInView();
  const [techRef, techVis] = useInView();
  const [rmRef, rmVis] = useInView();
  const [whyRef, whyVis] = useInView();
  const [faqRef, faqVis] = useInView();
  const [ctaRef, ctaVis] = useInView(0.05);

  const scrolled = scrollY > 60;

  // Center of the hub circle as percentages (matches CSS: left:50% top:50%)
  const HUB_CX = 50;
  const HUB_CY = 50;

  return (
    <div className="h-root">
      {/* ══ NAVBAR ══ */}
      <nav className={`h-nav${scrolled ? " h-nav-scrolled" : ""}`}>
        <div className="h-nav-in">
          <button
            className="h-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div className="h-logo-icon">
              <BookOpen size={18} color="#fff" strokeWidth={2} />
            </div>
            <span className="h-logo-text">Pariksha.io</span>
            <span className="h-logo-pill">
              <Sparkles size={10} strokeWidth={2.5} /> AI
            </span>
          </button>

          <div className="h-nav-links">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                className={`h-nav-link${activeNav === l.href ? " active" : ""}`}
                onClick={() => scrollTo(l.href)}>
                {l.label}
              </button>
            ))}
          </div>

          <div className="h-nav-cta">
            <button className="h-btn-ghost" onClick={() => navigate("/login")}>
              Sign In
            </button>
            <button
              className="h-btn-primary"
              onClick={() => navigate("/login")}>
              Get Started <ArrowRight size={14} strokeWidth={2.5} />
            </button>
          </div>

          <button
            className="h-hamburger"
            onClick={() => setMenuOpen((p) => !p)}>
            {menuOpen ? (
              <X size={22} strokeWidth={2} />
            ) : (
              <Menu size={22} strokeWidth={2} />
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="h-mobile-menu">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                className="h-mobile-link"
                onClick={() => scrollTo(l.href)}>
                {l.label} <ChevronRight size={15} />
              </button>
            ))}
            <button className="h-mobile-cta" onClick={() => navigate("/login")}>
              <Sparkles size={15} /> Get Started Free
            </button>
          </div>
        )}
      </nav>

      {/* ══ HERO ══ */}
      <section className="h-hero">
        <div className="h-hero-bg" style={{ transform: p(0.15) }} />
        <div className="h-hero-grid" />
        <div
          className="h-watermark"
          style={{
            transform: `translate(-50%, -50%) translateY(${scrollY * 0.08}px)`,
          }}>
          PARIKSHA
        </div>
        <div className="h-orb h-orb-a" style={{ transform: p(-0.2) }} />
        <div className="h-orb h-orb-b" style={{ transform: p(0.25) }} />
        <div className="h-orb h-orb-c" style={{ transform: p(-0.15) }} />

        {FLOATING_WORDS.map((w, i) => (
          <span
            key={w}
            className="h-float-word"
            style={{
              left: `${5 + ((i * 14.3) % 90)}%`,
              top: `${8 + ((i * 17.7) % 84)}%`,
              animationDelay: `${(i * 0.8) % 6}s`,
              animationDuration: `${12 + ((i * 3.1) % 10)}s`,
              transform: p(0.05 + (i % 5) * 0.03),
            }}>
            {w}
          </span>
        ))}

        <div className="h-hero-content">
          <div className="h-hero-left" style={{ transform: p(0.05) }}>
            <div className="h-eyebrow">
              <Sparkles size={13} strokeWidth={2.5} /> AI-Powered School
              Platform
            </div>
            <h1 className="h-hero-title">
              AI-Powered School
              <br />
              <span className="h-hero-accent">&amp; Exam Management</span>
            </h1>
            <p className="h-hero-sub">
              Manage students, teachers, attendance, exams, results, and
              AI-generated question papers from one intelligent platform.
            </p>
            <div className="h-hero-actions">
              <button
                className="h-cta-white"
                onClick={() => navigate("/login")}>
                <Sparkles size={17} strokeWidth={2} /> Get Started{" "}
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
              <button
                className="h-cta-outline"
                onClick={() => scrollTo("#workflow")}>
                <ChevronDown size={17} strokeWidth={2} /> See How It Works
              </button>
            </div>
            <div className="h-hero-tags">
              {["Free to start", "No credit card", "Setup in 5 min"].map(
                (t) => (
                  <span key={t} className="h-hero-tag">
                    <CheckCircle size={13} strokeWidth={2.5} /> {t}
                  </span>
                ),
              )}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="h-hero-right">
            <div
              className="h-dash-card h-dash-bg"
              style={{
                transform: `translate3d(0,${scrollY * 0.15}px,0) rotate(-3deg)`,
              }}>
              <div className="h-dash-header">
                <div className="h-dash-dot" style={{ background: "#EAF4F0" }} />
                <span>Student Analytics</span>
              </div>
              <div className="h-dash-bars">
                {[70, 85, 60, 92, 78].map((v, i) => (
                  <div key={i} className="h-dash-bar-wrap">
                    <div
                      className="h-dash-bar"
                      style={{ height: `${v}%`, background: "#A7D7C5" }}
                    />
                  </div>
                ))}
              </div>
              <div className="h-dash-label">Class Performance Overview</div>
            </div>

            <div
              className="h-dash-card h-dash-mid"
              style={{ transform: `translate3d(0,${scrollY * 0.25}px,0)` }}>
              <div className="h-dash-header">
                <div className="h-dash-dot" style={{ background: "#EEEDFE" }} />
                <span>AI Question Generator</span>
                <span className="h-dash-pill">Live</span>
              </div>
              <div className="h-dash-ai-row">
                <Brain size={16} color="#534AB7" strokeWidth={2} />
                <span>Generating Class 10 · Math · 20 MCQ</span>
              </div>
              <div className="h-dash-progress-wrap">
                <div className="h-dash-progress" />
              </div>
              <div className="h-dash-ai-stats">
                <span>Difficulty: Medium</span>
                <span>Topics: Algebra, Geometry</span>
              </div>
            </div>

            <div
              className="h-dash-card h-dash-front"
              style={{
                transform: `translate3d(0,${scrollY * 0.4}px,0) rotate(2deg)`,
              }}>
              <div className="h-dash-header">
                <div className="h-dash-dot" style={{ background: "#EAF4F0" }} />
                <span>Admin Dashboard</span>
              </div>
              <div className="h-dash-stats-row">
                {[
                  { label: "Teachers", val: "12", color: "#185FA5" },
                  { label: "Students", val: "348", color: "#1D9E75" },
                  { label: "Papers", val: "67", color: "#534AB7" },
                ].map((s) => (
                  <div key={s.label} className="h-dash-stat">
                    <span
                      className="h-dash-stat-val"
                      style={{ color: s.color }}>
                      {s.val}
                    </span>
                    <span className="h-dash-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>
              <div className="h-dash-activity">
                <span className="h-dash-activity-dot" />
                <span>Exam live · Class 10-A · 34 students active</span>
              </div>
            </div>
          </div>
        </div>

        <button className="h-scroll-cue" onClick={() => scrollTo("#features")}>
          <ChevronDown size={20} strokeWidth={2} />
        </button>
      </section>

      {/* ══ TRUST / FEATURES ══ */}
      <section
        className={`h-section h-trust${trustVis ? " vis" : ""}`}
        id="features"
        ref={trustRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Layers size={13} strokeWidth={2.5} /> Platform Capabilities
            </div>
            <h2 className="h-section-title">
              Everything a Modern School Needs
            </h2>
            <p className="h-section-sub">
              Built from the ground up for Indian schools and coaching centres.
              No bloat. No missing features.
            </p>
          </div>
          <div className="h-trust-grid">
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={item.label}
                className="h-trust-card"
                style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="h-trust-icon">
                  <item.icon size={22} strokeWidth={1.8} />
                </div>
                <div className="h-trust-text">
                  <p className="h-trust-label">{item.label}</p>
                  <p className="h-trust-desc">{item.desc}</p>
                </div>
                <ArrowRight
                  size={14}
                  strokeWidth={2.5}
                  className="h-trust-arrow"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PROBLEM → SOLUTION ══ */}
      <section
        className={`h-section h-section-alt h-prob${probVis ? " vis" : ""}`}
        ref={probRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Target size={13} strokeWidth={2.5} /> The Problem We Solve
            </div>
            <h2 className="h-section-title">Old School vs Pariksha.io</h2>
          </div>
          <div className="h-ps-grid">
            <div className="h-ps-col h-ps-problem">
              <div className="h-ps-col-header">
                <XCircle size={18} strokeWidth={2} />
                <span>Traditional Methods</span>
              </div>
              {PROBLEMS.map((prob, i) => (
                <div
                  key={prob}
                  className="h-ps-item h-ps-item-bad"
                  style={{ transitionDelay: `${i * 0.06}s` }}>
                  <XCircle
                    size={15}
                    strokeWidth={2.5}
                    className="h-ps-icon-bad"
                  />
                  <span>{prob}</span>
                </div>
              ))}
            </div>
            <div className="h-ps-divider">
              <div className="h-ps-divider-line" />
              <div className="h-ps-divider-badge">VS</div>
              <div className="h-ps-divider-line" />
            </div>
            <div className="h-ps-col h-ps-solution">
              <div className="h-ps-col-header h-ps-col-header-good">
                <CheckCircle size={18} strokeWidth={2} />
                <span>Pariksha.io</span>
              </div>
              {SOLUTIONS.map((sol, i) => (
                <div
                  key={sol}
                  className="h-ps-item h-ps-item-good"
                  style={{ transitionDelay: `${i * 0.06 + 0.1}s` }}>
                  <CheckCircle
                    size={15}
                    strokeWidth={2.5}
                    className="h-ps-icon-good"
                  />
                  <span>{sol}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ MODULES / ECOSYSTEM ══ */}
      <section
        className={`h-section h-modules${modVis ? " vis" : ""}`}
        ref={modRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <LayoutDashboard size={13} strokeWidth={2.5} /> Product Modules
            </div>
            <h2 className="h-section-title">
              One Platform. Every Academic Operation.
            </h2>
            <p className="h-section-sub">
              From attendance and timetables to AI-powered question generation
              and result analytics, every academic workflow is connected through
              Pariksha.io.
            </p>
          </div>

          {/* ── Desktop ecosystem diagram ── */}
          <div className="h-ecosystem">
            <div className="h-eco-watermark">ACADEMIC ECOSYSTEM</div>

            {/* SVG connector lines drawn with accurate cx/cy from MODULES data */}
            <svg className="h-eco-lines" aria-hidden="true">
              {MODULES.map((m) => (
                <line
                  key={m.label}
                  x1={`${HUB_CX}%`}
                  y1={`${HUB_CY}%`}
                  x2={`${m.cx}%`}
                  y2={`${m.cy}%`}
                />
              ))}
            </svg>

            <div className="h-eco-center">
              <BookOpen size={32} />
              <span>PARIKSHA.IO</span>
            </div>

            {MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <div
                  key={module.label}
                  className={`h-eco-node h-eco-${module.position}`}>
                  <Icon size={20} style={{ color: module.color }} />
                  <span>{module.label}</span>
                </div>
              );
            })}
          </div>

          {/* ── Mobile module grid (shown only on mobile) ── */}
          <div className="h-eco-mobile-grid">
            {MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <div key={module.label} className="h-eco-mobile-card">
                  <div
                    className="h-eco-mobile-icon"
                    style={{
                      background: `${module.color}18`,
                      color: module.color,
                    }}>
                    <Icon size={22} strokeWidth={1.8} />
                  </div>
                  <span className="h-eco-mobile-label">{module.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ WORKFLOW TIMELINE ══ */}
      <section
        className={`h-section h-section-alt h-workflow${wfVis ? " vis" : ""}`}
        id="workflow"
        ref={wfRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Zap size={13} strokeWidth={2.5} /> Platform Workflow
            </div>
            <h2 className="h-section-title">
              From School Setup to Performance Insights
            </h2>
            <p className="h-section-sub">
              A complete academic lifecycle powered by AI.
            </p>
          </div>

          <div className="h-wf-watermark">LEARNING JOURNEY</div>

          {/* Desktop zigzag */}
          <div className="h-wf-desktop">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                key={step.num}
                className={`h-wf-item ${i % 2 === 0 ? "left" : "right"}`}>
                {i < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`h-wf-connector ${i % 2 === 0 ? "conn-right" : "conn-left"}`}>
                    <svg viewBox="0 0 100 80" preserveAspectRatio="none">
                      {i % 2 === 0 ? (
                        <path d="M 0 0 Q 50 0 50 40 Q 50 80 100 80" />
                      ) : (
                        <path d="M 100 0 Q 50 0 50 40 Q 50 80 0 80" />
                      )}
                    </svg>
                  </div>
                )}
                <div className="h-wf-card">
                  <div
                    className="h-wf-icon"
                    style={{
                      background: `${step.color}14`,
                      color: step.color,
                    }}>
                    <step.icon size={22} />
                  </div>
                  <div className="h-wf-content">
                    <span className="h-wf-num">{step.num}</span>
                    <h3>{step.label}</h3>
                    <p>{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile vertical list */}
          <div className="h-wf-mobile">
            {WORKFLOW_STEPS.map((step, i) => (
              <div key={step.num} className="h-wf-mobile-item">
                <div className="h-wf-mobile-left">
                  <div
                    className="h-wf-mobile-dot"
                    style={{
                      background: `${step.color}18`,
                      color: step.color,
                      borderColor: `${step.color}40`,
                    }}>
                    <step.icon size={18} />
                  </div>
                  {i < WORKFLOW_STEPS.length - 1 && (
                    <div
                      className="h-wf-mobile-line"
                      style={{ borderColor: `${step.color}40` }}
                    />
                  )}
                </div>
                <div className="h-wf-mobile-card">
                  <span className="h-wf-num" style={{ color: step.color }}>
                    {step.num}
                  </span>
                  <h3>{step.label}</h3>
                  <p>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ROLE DASHBOARDS ══ */}
      <section
        className={`h-section h-roles${rolesVis ? " vis" : ""}`}
        id="roles"
        ref={rolesRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Users size={13} strokeWidth={2.5} /> Built for Everyone
            </div>
            <h2 className="h-section-title">Three Roles. One Platform.</h2>
          </div>
          <div className="h-roles-grid">
            {[
              {
                role: "Admin",
                icon: Shield,
                color: "#534AB7",
                bg: "linear-gradient(145deg, #EEEDFE, #F5F4FF)",
                border: "#CECBF6",
                features: [
                  "Create and manage teacher accounts",
                  "Approve student registrations",
                  "Assign mentor teachers to classes",
                  "Create and manage classrooms",
                  "Assign subject teachers",
                  "View platform-wide analytics",
                ],
              },
              {
                role: "Teacher",
                icon: BookOpen,
                color: "#185FA5",
                bg: "linear-gradient(145deg, #E6F1FB, #EFF6FF)",
                border: "#B5D4F4",
                features: [
                  "Generate AI question papers",
                  "Mark and manage attendance",
                  "Add and update student marks",
                  "Create class timetables",
                  "Evaluate short/long answers",
                  "Export papers as PDF",
                ],
              },
              {
                role: "Student",
                icon: GraduationCap,
                color: "#1D9E75",
                bg: "linear-gradient(145deg, #EAF4F0, #F0FFF8)",
                border: "#9FE1CB",
                features: [
                  "Attempt timed online exams",
                  "View marks and grade reports",
                  "Check personal attendance",
                  "View class timetable",
                  "Download question papers",
                  "See AI-assisted feedback",
                ],
              },
            ].map((r, i) => (
              <div
                key={r.role}
                className="h-role-card"
                style={{
                  background: r.bg,
                  borderColor: r.border,
                  transitionDelay: `${i * 0.1}s`,
                }}>
                <div
                  className="h-role-icon"
                  style={{ background: `${r.color}18`, color: r.color }}>
                  <r.icon size={28} strokeWidth={1.5} />
                </div>
                <h3 className="h-role-title" style={{ color: r.color }}>
                  {r.role}
                </h3>
                <ul className="h-role-list">
                  {r.features.map((f) => (
                    <li key={f}>
                      <CheckCircle
                        size={13}
                        strokeWidth={2.5}
                        style={{ color: r.color, flexShrink: 0 }}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ TECH STACK ══ */}
      <section
        className={`h-section h-section-alt h-tech${techVis ? " vis" : ""}`}
        ref={techRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Code2 size={13} strokeWidth={2.5} /> Technology
            </div>
            <h2 className="h-section-title">
              Built on Modern, Proven Technology
            </h2>
            <p className="h-section-sub">
              A robust, scalable stack chosen for reliability, performance, and
              developer experience.
            </p>
          </div>
          <div className="h-tech-grid">
            {TECH_STACK.map((t, i) => (
              <div
                key={t.label}
                className="h-tech-card"
                style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="h-tech-icon">
                  <t.icon size={28} strokeWidth={1.6} />
                </div>
                <p className="h-tech-label">{t.label}</p>
                <p className="h-tech-sub">{t.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ ROADMAP ══ */}
      <section
        className={`h-section h-roadmap${rmVis ? " vis" : ""}`}
        id="roadmap"
        ref={rmRef}>
        <div className="h-section-in h-section-narrow">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Rocket size={13} strokeWidth={2.5} /> Roadmap
            </div>
            <h2 className="h-section-title">What We've Built. What's Next.</h2>
          </div>
          <div className="h-rm-list">
            {ROADMAP.map((item, i) => (
              <div
                key={item.label}
                className={`h-rm-item h-rm-${item.status}`}
                style={{ transitionDelay: `${i * 0.07}s` }}>
                <div className="h-rm-node">
                  <item.icon size={16} strokeWidth={2.2} />
                </div>
                {i < ROADMAP.length - 1 && <div className="h-rm-line" />}
                <div className="h-rm-body">
                  <p className="h-rm-label">{item.label}</p>
                  <p className="h-rm-desc">{item.desc}</p>
                </div>
                <span className="h-rm-badge">
                  {item.status === "done" ? "Released" : ""}
                  {item.status === "active" ? "In Progress" : ""}
                  {item.status === "soon" ? "Coming Soon" : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ WHY SCHOOLS CHOOSE PARIKSHA.IO ══ */}
      <section
        className={`h-section h-section-alt h-bento${bentoVis ? " vis" : ""}`}
        ref={bentoRef}>
        <div className="h-section-in">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Sparkles size={13} strokeWidth={2.5} /> Why Schools Choose
              Pariksha.io
            </div>
            <h2 className="h-section-title">
              Built for Modern Educational Institutions
            </h2>
            <p className="h-section-sub">
              Everything schools need to automate academic operations, improve
              efficiency, and deliver better learning outcomes.
            </p>
          </div>

          <div className="h-bento-grid">
            {/* LARGE — AI Question Generation */}
            <div className="h-bento-card h-bento-ai">
              <div className="h-bento-glow h-bento-glow-green" />
              <div className="h-bento-icon-wrap h-bento-icon-green">
                <Brain size={28} strokeWidth={1.6} />
              </div>
              <div className="h-bento-content">
                <span className="h-bento-tag">Gemini AI</span>
                <h3 className="h-bento-title">AI Question Generation</h3>
                <p className="h-bento-desc">
                  Generate exam-ready papers instantly using Gemini AI. Choose
                  subject, topic, difficulty, and question type — your paper is
                  ready in seconds.
                </p>
                <div className="h-bento-ai-demo">
                  <div className="h-bento-ai-row">
                    <Brain size={13} strokeWidth={2} />
                    <span>Class 10 · Mathematics · 20 MCQ</span>
                    <span className="h-bento-ai-live">Live</span>
                  </div>
                  <div className="h-bento-ai-bar-wrap">
                    <div className="h-bento-ai-bar" />
                  </div>
                  <div className="h-bento-ai-chips">
                    {["Algebra", "Geometry", "Medium"].map((c) => (
                      <span key={c} className="h-bento-chip">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* WIDE — Student Management */}
            <div className="h-bento-card h-bento-students">
              <div className="h-bento-glow h-bento-glow-blue" />
              <div className="h-bento-icon-wrap h-bento-icon-blue">
                <Users size={24} strokeWidth={1.6} />
              </div>
              <h3 className="h-bento-title">Student Management</h3>
              <p className="h-bento-desc">
                Centralised records, attendance, marks, and complete academic
                history — all in one place.
              </p>
              <div className="h-bento-stat-row">
                {[
                  { val: "348", label: "Students", color: "#185FA5" },
                  { val: "98%", label: "Data accuracy", color: "#1D9E75" },
                  { val: "12", label: "Classes", color: "#534AB7" },
                ].map((s) => (
                  <div key={s.label} className="h-bento-stat">
                    <span
                      className="h-bento-stat-val"
                      style={{ color: s.color }}>
                      {s.val}
                    </span>
                    <span className="h-bento-stat-lbl">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SMALL — Attendance */}
            <div className="h-bento-card h-bento-attendance">
              <div className="h-bento-glow h-bento-glow-purple" />
              <div className="h-bento-icon-wrap h-bento-icon-purple">
                <CheckSquare size={22} strokeWidth={1.6} />
              </div>
              <h3 className="h-bento-title">Attendance Automation</h3>
              <p className="h-bento-desc">
                Replace paper registers with digital attendance tracking and
                instant reports.
              </p>
              <div className="h-bento-att-dots">
                {Array.from({ length: 20 }, (_, i) => (
                  <span
                    key={i}
                    className={`h-bento-dot ${i < 17 ? "present" : "absent"}`}
                  />
                ))}
              </div>
              <p className="h-bento-att-note">
                85% attendance · Class 10-A · Today
              </p>
            </div>

            {/* SMALL — Secure Role Access */}
            <div className="h-bento-card h-bento-roles">
              <div className="h-bento-glow h-bento-glow-green" />
              <div className="h-bento-icon-wrap h-bento-icon-green">
                <Shield size={22} strokeWidth={1.6} />
              </div>
              <h3 className="h-bento-title">Secure Role Access</h3>
              <p className="h-bento-desc">
                Separate, permission-scoped dashboards for Admins, Teachers, and
                Students.
              </p>
              <div className="h-bento-role-pills">
                {[
                  { label: "Admin", color: "#534AB7", bg: "#EEEDFE" },
                  { label: "Teacher", color: "#185FA5", bg: "#E6F1FB" },
                  { label: "Student", color: "#0F6E56", bg: "#EAF4F0" },
                ].map((r) => (
                  <span
                    key={r.label}
                    className="h-bento-role-pill"
                    style={{ color: r.color, background: r.bg }}>
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            {/* SMALL — Performance Analytics */}
            <div className="h-bento-card h-bento-analytics">
              <div className="h-bento-glow h-bento-glow-red" />
              <div className="h-bento-icon-wrap h-bento-icon-red">
                <PieChart size={22} strokeWidth={1.6} />
              </div>
              <h3 className="h-bento-title">Performance Analytics</h3>
              <p className="h-bento-desc">
                Monitor student progress and academic outcomes in real time with
                visual insights.
              </p>
              <div className="h-bento-bars">
                {[82, 67, 91, 74, 88].map((v, i) => (
                  <div key={i} className="h-bento-bar-col">
                    <div
                      className="h-bento-bar-fill"
                      style={{ height: `${v}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* SMALL — Timetable Management */}
            <div className="h-bento-card h-bento-timetable">
              <div className="h-bento-glow h-bento-glow-gold" />
              <div className="h-bento-icon-wrap h-bento-icon-gold">
                <CalendarDays size={22} strokeWidth={1.6} />
              </div>
              <h3 className="h-bento-title">Timetable Management</h3>
              <p className="h-bento-desc">
                Organise class schedules, teacher assignments, and periods
                efficiently across all sections.
              </p>
              <div className="h-bento-schedule">
                {[
                  { time: "9:00", sub: "Mathematics" },
                  { time: "10:00", sub: "Physics" },
                  { time: "11:00", sub: "Chemistry" },
                ].map((s) => (
                  <div key={s.time} className="h-bento-schedule-row">
                    <span className="h-bento-schedule-time">{s.time}</span>
                    <span className="h-bento-schedule-sub">{s.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ══ */}
      <section
        className={`h-section h-faq${faqVis ? " vis" : ""}`}
        id="faq"
        ref={faqRef}>
        <div className="h-section-in h-section-narrow">
          <div className="h-section-hd">
            <div className="h-eyebrow h-eyebrow-dark">
              <Bell size={13} strokeWidth={2.5} /> FAQ
            </div>
            <h2 className="h-section-title">Frequently Asked Questions</h2>
          </div>
          <div className="h-faqs">
            {FAQS.map((faq, i) => (
              <div
                key={i}
                className={`h-faq-item${openFaq === i ? " open" : ""}`}
                style={{ transitionDelay: `${i * 0.05}s` }}>
                <button
                  className="h-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={18}
                    strokeWidth={2}
                    className="h-faq-chevron"
                  />
                </button>
                {openFaq === i && <div className="h-faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className={`h-cta-section${ctaVis ? " vis" : ""}`} ref={ctaRef}>
        <div className="h-cta-bg" style={{ transform: p(0.12) }} />
        <div className="h-cta-grid" />
        <div
          className="h-cta-blob h-cta-blob-a"
          style={{ transform: p(-0.18) }}
        />
        <div
          className="h-cta-blob h-cta-blob-b"
          style={{ transform: p(0.22) }}
        />
        <div className="h-cta-watermark">AI · AUTOMATION · EDUCATION</div>
        <div className="h-cta-inner">
          <div className="h-cta-icon-wrap">
            <Sparkles size={28} strokeWidth={1.5} />
          </div>
          <h2 className="h-cta-title">Ready to Modernise Your School?</h2>
          <p className="h-cta-sub">
            Join the growing community of schools using Pariksha.io to simplify
            academic operations through AI and automation.
          </p>
          <div className="h-cta-actions">
            <button className="h-cta-btn-w" onClick={() => navigate("/login")}>
              <Sparkles size={17} strokeWidth={2} /> Get Started{" "}
              <ArrowRight size={15} strokeWidth={2.5} />
            </button>
            <button className="h-cta-btn-o" onClick={() => scrollTo("#faq")}>
              Book a Demo
            </button>
          </div>
          <p className="h-cta-note">
            <Lock size={12} strokeWidth={2} /> No credit card required · Free to
            start · Setup in minutes
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="h-footer">
        <div className="h-footer-in">
          <div className="h-footer-brand">
            <div className="h-footer-logo">
              <div className="h-footer-logo-icon">
                <BookOpen size={16} color="#fff" strokeWidth={2} />
              </div>
              <span>Pariksha.io</span>
            </div>
            <p className="h-footer-desc">
              AI-powered exam and school management platform for modern
              educational institutions across India.
            </p>
            <div className="h-footer-socials">
              {[FaGithub, FaLinkedin, FaTwitter, Mail].map((Icon, idx) => (
                <a key={idx} href="#" className="h-footer-social">
                  <Icon size={16} strokeWidth={2} />
                </a>
              ))}
            </div>
          </div>
          <div className="h-footer-cols">
            {[
              {
                title: "Platform",
                links: ["Features", "How It Works", "Modules", "Roadmap"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
              {
                title: "Legal",
                links: [
                  "Privacy Policy",
                  "Terms of Use",
                  "Security",
                  "Cookies",
                ],
              },
            ].map((col) => (
              <div key={col.title} className="h-footer-col">
                <p className="h-footer-col-title">{col.title}</p>
                {col.links.map((l) => (
                  <a key={l} href="#" className="h-footer-link">
                    {l}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="h-footer-bottom">
          <p>© {new Date().getFullYear()} Pariksha.io. All rights reserved.</p>
          <p>Built for Indian Education · Powered by Google Gemini AI</p>
        </div>
      </footer>
    </div>
  );
}
