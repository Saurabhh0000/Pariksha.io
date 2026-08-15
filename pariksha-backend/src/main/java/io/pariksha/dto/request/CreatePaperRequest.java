package io.pariksha.dto.request;

import java.time.LocalDateTime;
import java.util.List;

import io.pariksha.enums.ExamType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class CreatePaperRequest {
	
	@NotBlank(message = "Title is required")
	private String title;
	
	@NotBlank(message = "Subject is required")
	private String subject;
	
	@NotBlank(message = "Class Level is required")
	private String classLevel;
	
	@NotNull(message = "Class Room ID is required")
	private Long classRoomId;
	
	@NotNull(message = "Exam type is required")
	private ExamType examType;
	
	@NotNull(message = "Duration is required")
	@Min(value = 1, message = "Duration must be at least 1 minute")
	private Integer durationMinutes;
	
	private String instructions;
	
	private LocalDateTime examStartTime;
	
	private LocalDateTime examEndTime;
	
	@NotEmpty(message = "At least one question is required")
	private List<Long> questionIds;

}
