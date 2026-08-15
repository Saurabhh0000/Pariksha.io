package io.pariksha.dto.request;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;
import jakarta.validation.constraints.Min;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateQuestionRequest {
	
	private String subject;
	private String topic;
	private QuestionType questionType;
	private DifficultyLevel difficultyLevel;
	private String questionText;
	private String options;
	private String answer;
	private String explanation;
	
	@Min(value = 1, message = "Marks must be atleast 1")
	private Integer marks;
	
	private String classLevel;

}
