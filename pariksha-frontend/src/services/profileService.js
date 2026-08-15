import axios from "./axios"; // your configured axios with JWT header

// GET logged-in user's profile (admin/teacher/student)
export const getMyProfile = () => axios.get("/api/profile/me");