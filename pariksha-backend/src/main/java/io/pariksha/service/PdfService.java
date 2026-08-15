package io.pariksha.service;

import org.springframework.stereotype.Service;

@Service
public interface PdfService {

    // Teacher PDF — includes answer key at end
    byte[] generateTeacherPdf(Long paperId, Long teacherUserId);

    // Student PDF — questions only, no answers
    byte[] generateStudentPdf(Long paperId, Long studentUserId);
}