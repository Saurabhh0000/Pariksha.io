package io.pariksha.dto.request;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class CreateQuestionRequest {
	
	@NotBlank(message = "Subject is required")
	private String subject;
	
	@NotBlank(message = "Topic is required")
	private String topic;
	
	@NotNull(message = "Question type is required")
	private QuestionType questionType;
	
	@NotNull(message = "Difficulty level is required")
	private DifficultyLevel difficultyLevel;
	
	@NotBlank(message = "Question text is required")
	private String questionText;
	
	private String options;
	
	@NotBlank(message = "Answer is required")
	private String answer;
	
	private String explanation;
	
	@NotNull(message = "Marks is required")
	@Min(value = 1, message = "Marks must be at least 1")
	private Integer marks;
	
	@NotBlank(message = "Class level is required")
	private String classLevel;

}
