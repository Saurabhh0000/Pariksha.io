package io.pariksha.dto.request;

import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

// Full exam submission — all answers at once
@Getter
@Setter
public class SubmitExamRequest {

    @NotEmpty(message = "Answers list cannot be empty")
    private List<SubmitAnswerRequest> answers;
}