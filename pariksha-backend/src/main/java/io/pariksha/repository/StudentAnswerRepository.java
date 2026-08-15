package io.pariksha.repository;

import io.pariksha.entity.ExamSession;
import io.pariksha.entity.StudentAnswer;
import io.pariksha.enums.AnswerEvaluationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentAnswerRepository
        extends JpaRepository<StudentAnswer, Long> {

    // All answers in a session
    List<StudentAnswer> findByExamSession(ExamSession session);

    // Answer for specific question in session
    Optional<StudentAnswer> findByExamSessionAndQuestionId(
            ExamSession session, Long questionId);

    // Pending review answers in a session
    List<StudentAnswer> findByExamSessionAndEvaluationStatus(
            ExamSession session, AnswerEvaluationStatus status);
}