import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRole }) {
  const { isAuthenticated, role, firstLogin } = useAuth();

  // Not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Must change password first
  if (firstLogin) {
    return <Navigate to="/change-password" replace />;
  }

  // Wrong role — redirect to correct dashboard
  if (allowedRole && role !== allowedRole) {
    if (role === "ROLE_ADMIN")
      return <Navigate to="/admin/dashboard" replace />;
    if (role === "ROLE_TEACHER")
      return <Navigate to="/teacher/dashboard" replace />;
    if (role === "ROLE_STUDENT")
      return <Navigate to="/student/dashboard" replace />;
  }

  return children;
}
