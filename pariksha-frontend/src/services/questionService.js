import api from "./axios";

const questionService = {

  create:       (data)   => api.post("/api/questions", data),
  update:       (id, d)  => api.put(`/api/questions/${id}`, d),
  delete:       (id)     => api.delete(`/api/questions/${id}`),
  getById:      (id)     => api.get(`/api/questions/${id}`),
  getMyQuestions: ()     => api.get("/api/questions/my"),
  getAll:       ()       => api.get("/api/questions/all"),
  filter:       (params) => api.get("/api/questions/filter",
      { params }),
  getSubjects:  ()       => api.get("/api/questions/subjects"),
  getTopics:    (subject) =>
    api.get("/api/questions/topics", { params: { subject } }),
};

export default questionService;