package io.pariksha.dto.response;

import io.pariksha.enums.ExamSessionStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
public class ExamSessionResponse {

    private Long id;

    // Student info
    private Long studentUserId;
    private String studentName;
    private String studentRollCode;

    // Paper info
    private Long paperId;
    private String paperTitle;
    private String subject;
    private Integer totalMarks;

    // Session info
    private ExamSessionStatus status;
    private LocalDateTime startedAt;
    private LocalDateTime expiresAt;
    private Long timeRemainingSeconds;
    private LocalDateTime submittedAt;

    // Result — filled after evaluation
    private Double totalMarksObtained;
    private Double percentage;
    private String grade;

    // All answers
    private List<StudentAnswerResponse> answers;
}