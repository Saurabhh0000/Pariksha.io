package io.pariksha.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// Teacher evaluates a SHORT/LONG answer
@Getter
@Setter
public class EvaluateAnswerRequest {

    @NotNull(message = "Answer ID is required")
    private Long answerId;

    @NotNull(message = "Marks awarded is required")
    private Double marksAwarded;

    // Optional feedback from teacher
    private String teacherFeedback;
}