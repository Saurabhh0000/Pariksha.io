package io.pariksha.entity;

import io.pariksha.enums.AnswerEvaluationStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// Stores one answer given by student for one question
@Entity
@Table(name = "student_answers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Which exam session this belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ExamSession examSession;

    // Which question was answered
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    // Student's answer text
    @Column(columnDefinition = "TEXT")
    private String answerText;

    // Is this answer correct?
    // true  → correct (auto for MCQ/TRUE_FALSE)
    // false → wrong
    // null  → not evaluated yet (SHORT/LONG)
    private Boolean isCorrect;

    // Marks given for this answer
    // Auto filled for MCQ (full marks or 0)
    // Teacher fills for SHORT/LONG
    private Double marksAwarded;

    // AUTO_EVALUATED / PENDING_REVIEW / REVIEWED
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnswerEvaluationStatus evaluationStatus;

    // Teacher's feedback on this answer
    @Column(columnDefinition = "TEXT")
    private String teacherFeedback;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime answeredAt;
}