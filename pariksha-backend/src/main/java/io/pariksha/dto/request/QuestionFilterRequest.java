package io.pariksha.dto.request;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class QuestionFilterRequest {
	
	private String subject;
	private String topic;
	private QuestionType questionType;
	private DifficultyLevel difficultyLevel;
	private String classLevel;

}
