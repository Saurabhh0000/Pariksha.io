import api from "./axios";

const teacherService = {

  // Profile
  getProfile:       ()     => api.get("/api/profile/me"),
  updateProfile:    (data) => api.put("/api/profile/teacher", data),
  uploadPhoto:      (form) => api.post("/api/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" }
  }),

  // Students
  addStudent:       (data) => api.post("/api/teacher/students", data),

  // Classes
  getClasses:       ()       => api.get("/api/teacher/classes"),
  getStudentsIn:    (classId) =>
    api.get(`/api/teacher/classes/${classId}/students`),

  // Attendance
  markAttendance:   (data)   => api.post("/api/teacher/attendance", data),
  getAttendance:    (classId, date) =>
    api.get(`/api/teacher/attendance/${classId}`, { params: { date } }),

  // Marks
  addMarks:         (data)   => api.post("/api/teacher/marks", data),
  updateMarks:      (id, data) => api.put(`/api/teacher/marks/${id}`, data),
  getStudentMarks:  (stuId)  =>
    api.get(`/api/teacher/marks/${stuId}`),

  // Timetable
  createTimetable:  (data)   => api.post("/api/teacher/timetable", data),
  updateTimetable:  (id, d)  => api.put(`/api/teacher/timetable/${id}`, d),
  deleteTimetable:  (id)     =>
    api.delete(`/api/teacher/timetable/${id}`),
  getClassTimetable: (classId) =>
    api.get(`/api/teacher/timetable/class/${classId}`),
  getMyTimetable:   ()       => api.get("/api/teacher/timetable/me"),

  // Activities
  getRecentActivities: () => api.get("/api/teacher/activities"),

  // Exam results
  getMyPapers: () => api.get("/api/papers/my"),
  getPaperResults:  (paperId) =>
    api.get(`/api/teacher/exam/${paperId}/results`),
  evaluateAnswer:   (sessionId, data) =>
    api.post(`/api/teacher/exam/session/${sessionId}/evaluate`, data),
  getAiEval:        (answerId) =>
    api.get(`/api/teacher/exam/answer/${answerId}/ai-evaluate`),
};

export default teacherService;