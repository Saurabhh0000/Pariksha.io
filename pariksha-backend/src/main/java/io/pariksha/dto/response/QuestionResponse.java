package io.pariksha.dto.response;

import java.time.LocalDateTime;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class QuestionResponse {
	
	private Long id;
	
	private Long createdByUserId;
	private String createdByName;
	private String createdByTeacherCode;
	
	private String subject;
	private String topic;
	private QuestionType questionType;
	private DifficultyLevel difficultyLevel;
	private String questionText;
	private String options;
	private String answer;
	private String explanation;
	private Integer marks;
	private String classLevel;
	private boolean active;
	private LocalDateTime createdAt;

}
