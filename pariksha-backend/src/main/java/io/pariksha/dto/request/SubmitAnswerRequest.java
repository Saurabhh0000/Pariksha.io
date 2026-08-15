package io.pariksha.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

// One answer for one question
@Getter
@Setter
public class SubmitAnswerRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    // Student's answer text
    // For MCQ → "Option B"
    // For TRUE_FALSE → "True" or "False"
    // For SHORT/LONG → full answer text
    // For FILL_IN_THE_BLANK → the word/phrase
    private String answerText;
}