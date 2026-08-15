import api from "./axios";

const pdfService = {

  // Teacher — with answer key
  downloadTeacher: async (paperId) => {
    const res = await api.get(
      `/api/pdf/teacher/${paperId}`,
      { responseType: "blob" }
    );
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `paper_${paperId}_teacher.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Student — questions only
  downloadStudent: async (paperId) => {
    const res = await api.get(
      `/api/pdf/student/${paperId}`,
      { responseType: "blob" }
    );
    const url  = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href  = url;
    link.setAttribute("download", `paper_${paperId}_questions.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default pdfService;