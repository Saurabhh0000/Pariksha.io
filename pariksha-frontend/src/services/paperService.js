import api from "./axios";

const paperService = {

  createManual:  (data) => api.post("/api/papers", data),
  createAi:      (data) => api.post("/api/papers/ai", data),
  getMyPapers:   ()     => api.get("/api/papers/my"),
  getById:       (id)   => api.get(`/api/papers/${id}`),
  delete:        (id)   => api.delete(`/api/papers/${id}`),
  getAll:        ()     => api.get("/api/papers/all"),
};

export default paperService;