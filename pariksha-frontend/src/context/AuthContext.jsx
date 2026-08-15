import { createContext, useContext, useState } from "react";
// ← removed useEffect (was imported but never used)

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // ── State — initialized from localStorage ──
  const [token, setToken] = useState(
    () => localStorage.getItem("token") || null,
  );

  const [role, setRole] = useState(() => localStorage.getItem("role") || null);

  const [email, setEmail] = useState(
    () => localStorage.getItem("email") || null,
  );

  const [userId, setUserId] = useState(
    () => localStorage.getItem("userId") || null,
  );

  // ← firstLogin also reads from localStorage
  // so page refresh doesn't lose the state
  const [firstLogin, setFirstLogin] = useState(
    () => localStorage.getItem("firstLogin") === "true",
  );

  // ────────────────────────────────────────
  //   LOGIN — save all auth data
  // ────────────────────────────────────────

  function login(data) {
    // Save to localStorage — survives page refresh
    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("email", data.email);
    localStorage.setItem("firstLogin", String(data.firstLogin));

    // Update state
    setToken(data.token);
    setRole(data.role);
    setEmail(data.email);
    setFirstLogin(data.firstLogin);

    // Decode userId from JWT payload
    // JWT format: header.payload.signature
    // payload is base64 encoded JSON
    try {
      const payloadBase64 = data.token.split(".")[1];
      const payloadJson = atob(payloadBase64);
      const payload = JSON.parse(payloadJson);

      // Our JWT stores userId as "sub" (subject) claim
      localStorage.setItem("userId", payload.sub);
      setUserId(payload.sub);
    } catch (e) {
      // Token decode failed — not critical
      // userId will be fetched from profile API
      console.error("JWT decode error:", e.message);
    }
  }

  // ────────────────────────────────────────
  //   CHANGE PASSWORD COMPLETE
  //   Called after first login password change
  // ────────────────────────────────────────

  function completeFirstLogin() {
    localStorage.setItem("firstLogin", "false");
    setFirstLogin(false);
  }

  // ────────────────────────────────────────
  //   LOGOUT — clear everything
  // ────────────────────────────────────────

  function logout() {
    localStorage.clear();
    setToken(null);
    setRole(null);
    setEmail(null);
    setUserId(null);
    setFirstLogin(false);
  }

  // ────────────────────────────────────────
  //   COMPUTED
  // ────────────────────────────────────────

  const isAuthenticated = !!token;

  // ────────────────────────────────────────
  //   ROLE HELPERS
  // ────────────────────────────────────────

  const isAdmin = role === "ROLE_ADMIN";
  const isTeacher = role === "ROLE_TEACHER";
  const isStudent = role === "ROLE_STUDENT";

  return (
    <AuthContext.Provider
      value={{
        token,
        role,
        email,
        userId,
        firstLogin,
        isAuthenticated,
        isAdmin,
        isTeacher,
        isStudent,
        login,
        logout,
        completeFirstLogin,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Custom hook — use this everywhere ──
// Example: const { token, role, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
