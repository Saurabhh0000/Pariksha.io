package io.pariksha.dto.response;

import io.pariksha.enums.AnswerEvaluationStatus;
import io.pariksha.enums.QuestionType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class StudentAnswerResponse {

    private Long id;
    private Long questionId;
    private String questionText;
    private QuestionType questionType;
    private String options;
    private String answerText;          // student's answer

    // Only shown after evaluation
    private String correctAnswer;       // shown after submission
    private Boolean isCorrect;
    private Double marksAwarded;
    private Integer totalMarksForQuestion;
    private AnswerEvaluationStatus evaluationStatus;
    private String teacherFeedback;
}