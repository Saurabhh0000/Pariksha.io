import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, User, GraduationCap, BookOpen, Clock } from "lucide-react";

/**
 * Quick Search — fully client-side, searches across already-fetched
 * teachers / students / classes arrays. No additional API calls.
 */
export default function QuickSearch({ teachers, students, classes }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return { teachers: [], students: [], classes: [] };

    return {
      teachers: teachers
        .filter(
          (t) =>
            `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
            t.teacherCode?.toLowerCase().includes(q) ||
            t.email?.toLowerCase().includes(q),
        )
        .slice(0, 4),
      students: students
        .filter(
          (s) =>
            `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
            s.studentRollCode?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q),
        )
        .slice(0, 4),
      classes: classes
        .filter((c) => `${c.className}-${c.section}`.toLowerCase().includes(q))
        .slice(0, 4),
    };
  }, [query, teachers, students, classes]);

  const hasResults =
    results.teachers.length ||
    results.students.length ||
    results.classes.length;
  const showDropdown = focused && query.trim().length > 0;

  return (
    <div className="ad-quicksearch" ref={wrapRef}>
      <div className="ad-quicksearch-input-wrap">
        <Search size={16} strokeWidth={2} className="ad-quicksearch-icon" />
        <input
          type="text"
          placeholder="Search teachers, students, classes..."
          className="ad-quicksearch-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          aria-label="Quick search across teachers, students, and classes"
        />
        {query && (
          <button
            className="ad-quicksearch-clear"
            onClick={() => setQuery("")}
            aria-label="Clear search">
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="ad-quicksearch-dropdown" role="listbox">
          {!hasResults ? (
            <div className="ad-quicksearch-empty">No matches for "{query}"</div>
          ) : (
            <>
              {results.students.map((s) => (
                <button
                  key={`s-${s.id}`}
                  className="ad-quicksearch-item"
                  onClick={() => navigate("/admin/students")}>
                  <GraduationCap size={14} strokeWidth={2} color="#1D9E75" />
                  <span className="ad-qs-name">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="ad-qs-meta">
                    {s.studentRollCode} · Class {s.className}-{s.section}
                  </span>
                </button>
              ))}
              {results.teachers.map((t) => (
                <button
                  key={`t-${t.id}`}
                  className="ad-quicksearch-item"
                  onClick={() => navigate("/admin/teachers")}>
                  <User
                    size={14}
                    strokeWidth={2}
                    color="var(--admin-primary)"
                  />
                  <span className="ad-qs-name">
                    {t.firstName} {t.lastName}
                  </span>
                  <span className="ad-qs-meta">{t.teacherCode}</span>
                </button>
              ))}
              {results.classes.map((c) => (
                <button
                  key={`c-${c.id}`}
                  className="ad-quicksearch-item"
                  onClick={() => navigate("/admin/classes")}>
                  <BookOpen size={14} strokeWidth={2} color="#185FA5" />
                  <span className="ad-qs-name">
                    Class {c.className}-{c.section}
                  </span>
                  <span className="ad-qs-meta">
                    {c.mentorTeacherName || "No mentor"}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
