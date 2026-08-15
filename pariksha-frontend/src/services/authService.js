import api from "./axios";

const authService = {

  login: (data) =>
    api.post("/api/auth/login", data),

  changePassword: (data) =>
    api.post("/api/auth/change-password", data),

  getProfile: () =>
    api.get("/api/profile/me"),
};

export default authService;