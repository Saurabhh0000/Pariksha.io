import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/shared/ProtectedRoute";

// Shared pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import NotFound from "./pages/NotFound";
import PendingApproval from "./pages/PendingApproval";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminTeachers from "./pages/admin/AdminTeachers";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminClasses from "./pages/admin/AdminClasses";
import AdminPendingStudents from "./pages/admin/AdminPending";
import AdminQuestions from "./pages/admin/AdminQuestions";
import AdminPapers from "./pages/admin/AdminPapers";
import AdminProfile from "./pages/admin/AdminProfile";

// Teacher pages
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherProfile from "./pages/teacher/TeacherProfile";
import TeacherClasses from "./pages/teacher/TeacherClasses";
import TeacherStudents from "./pages/teacher/TeacherStudents";
import TeacherAttendance from "./pages/teacher/TeacherAttendance";
import TeacherMarks from "./pages/teacher/TeacherMarks";
import TeacherTimetable from "./pages/teacher/TeacherTimetable";
import TeacherMySchedule from "./pages/teacher/TeacherMySchedule";
import TeacherQuestions from "./pages/teacher/TeacherQuestions";
import TeacherPapers from "./pages/teacher/TeacherPapers";
import TeacherResults from "./pages/teacher/TeacherResults";

// Student pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentMarks from "./pages/student/StudentMarks";
import StudentTimetable from "./pages/student/StudentTimetable";
import StudentPapers from "./pages/student/StudentPapers";
import StudentExam from "./pages/student/StudentExam";
import StudentProfile from "./pages/student/StudentProfile";

// CSS
import "./styles/global.css";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Default redirect */}
          <Route path="/" element={<Home />} />

          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/pending-approval" element={<PendingApproval />} />

          {/* ── ADMIN ROUTES ── */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminTeachers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/pending"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminPendingStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/questions"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/papers"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminPapers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/profile"
            element={
              <ProtectedRoute allowedRole="ROLE_ADMIN">
                <AdminProfile />
              </ProtectedRoute>
            }
          />

          {/* ── TEACHER ROUTES ── */}
          <Route
            path="/teacher/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/classes"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/profile"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/marks"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherMarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/timetable"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/my-schedule"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherMySchedule />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/questions"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherQuestions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/papers"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherPapers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/results"
            element={
              <ProtectedRoute allowedRole="ROLE_TEACHER">
                <TeacherResults />
              </ProtectedRoute>
            }
          />

          {/* ── STUDENT ROUTES ── */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/attendance"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/marks"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentMarks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/timetable"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentTimetable />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/papers"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentPapers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exams"
            element={
              <ProtectedRoute allowedRole="ROLE_STUDENT">
                <StudentExam />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
