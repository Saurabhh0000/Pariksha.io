package io.pariksha.dto.response;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class PaperQuestionResponse {
	
	private Long id;
	private Long questionId;
	private Integer questionOrder;
	private String subject;
	private String topic;
	private QuestionType questionType;
	private DifficultyLevel difficultyLevel;
	private String questionText;
	private String options;
	private String answer;
	private String explanation;
	private Integer marks;

}
