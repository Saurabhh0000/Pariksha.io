import api from "./axios";

const adminService = {

  // Teachers
  createTeacher:  (data) => api.post("/api/admin/teachers", data),
  getAllTeachers:  ()     => api.get("/api/admin/teachers"),
  removeTeacher:  (id)   => api.delete(`/api/admin/teachers/${id}`),

  // Students
  createStudent:  (data) => api.post("/api/admin/students", data),
  getAllStudents:  ()     => api.get("/api/admin/students"),
  removeStudent:  (id)   => api.delete(`/api/admin/students/${id}`),

  // Pending
  getPending:     ()     => api.get("/api/admin/students/pending"),
  approveStudent: (id)   => api.put(`/api/admin/students/${id}/approve`),
  rejectStudent:  (id)   => api.put(`/api/admin/students/${id}/reject`),

  // Classes
  updateMentor:        (id, teacherId)  => api.put(`/api/admin/classes/${id}/mentor`, { teacherUserId: teacherId }),
  addSubjectTeacher:   (id, data)       => api.post(`/api/admin/classes/${id}/subjects`, data),
  removeSubjectTeacher:(id, tid, subj)  => api.delete(`/api/admin/classes/${id}/subjects/${tid}?subject=${subj}`),
  createClass:    (data) => api.post("/api/admin/classes", data),
  getAllClasses:   ()     => api.get("/api/admin/classes"),
  getClassById:   (id)   => api.get(`/api/admin/classes/${id}`),
  assignMentor:   (id, data) =>
    api.put(`/api/admin/classes/${id}/mentor`, data),
  assignSubject:  (id, data) =>
    api.post(`/api/admin/classes/${id}/subjects`, data),
  removeSubject:  (classId, teacherId, subject) =>
    api.delete(
      `/api/admin/classes/${classId}/subjects/${teacherId}`,
      { params: { subject } }
    ),
};

export default adminService;