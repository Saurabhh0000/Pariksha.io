import api from "./axios";

const studentService = {

  // Profile
  getProfile:      ()     => api.get("/api/profile/me"),
  updateProfile:   (data) => api.put("/api/profile/student", data),
  uploadPhoto:     (form) => api.post("/api/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" }
  }),

  // Attendance
  getAttendance:   ()     => api.get("/api/student/attendance"),
  getSummary:      ()     => api.get("/api/student/attendance/summary"),

  // Marks
  getMarks:        ()     => api.get("/api/student/marks"),
  getMarksSummary: ()     => api.get("/api/student/marks/summary"),

  // Timetable
  getTimetable:    ()     => api.get("/api/student/timetable"),

  // Papers
  getMyPapers:     ()     => api.get("/api/student/papers"),
  getPaperById: (id) => api.get(`/api/papers/${id}`), 

  // Exam
  startExam:    (paperId)        =>
    api.post(`/api/student/exam/${paperId}/start`),
  submitExam:   (paperId, data)  =>
    api.post(`/api/student/exam/${paperId}/submit`, data),
  getResult:    (paperId)        =>
    api.get(`/api/student/exam/${paperId}/result`),
  getHistory:   ()               =>
    api.get("/api/student/exam/history"),
};

export default studentService;