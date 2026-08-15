package io.pariksha.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.ExamSession;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.User;
import io.pariksha.enums.ExamSessionStatus;

@Repository
public interface ExamSessionRepository
        extends JpaRepository<ExamSession, Long> {

    // Check if student already attempted this paper
    Optional<ExamSession> findByStudentAndQuestionPaper(
            User student, QuestionPaper paper);

    // All sessions for a paper — teacher views results
    List<ExamSession> findByQuestionPaper(QuestionPaper paper);

    // All sessions by a student
    List<ExamSession> findByStudent(User student);

    // Submitted sessions for a paper
    List<ExamSession> findByQuestionPaperAndStatus(
            QuestionPaper paper, ExamSessionStatus status);
    
    List<ExamSession> findByStatusAndExpiresAtBefore(
            ExamSessionStatus status,
            LocalDateTime time);
}