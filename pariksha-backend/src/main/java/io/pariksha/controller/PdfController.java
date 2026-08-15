package io.pariksha.controller;

import io.pariksha.service.PdfService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/pdf")
@RequiredArgsConstructor
public class PdfController {

    private final PdfService pdfService;

    // GET /api/pdf/teacher/{paperId}
    // Teacher downloads paper WITH answer key
    @GetMapping("/teacher/{paperId}")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<byte[]> downloadTeacherPdf(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        byte[] pdf = pdfService.generateTeacherPdf(paperId, teacherUserId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"paper_" + paperId
                        + "_teacher.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    // GET /api/pdf/student/{paperId}
    // Student downloads paper WITHOUT answers
    @GetMapping("/student/{paperId}")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_STUDENT')")
    public ResponseEntity<byte[]> downloadStudentPdf(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long userId = (Long) httpRequest.getAttribute("userId");

        byte[] pdf = pdfService.generateStudentPdf(paperId, userId);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"paper_" + paperId + "_questions.pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}