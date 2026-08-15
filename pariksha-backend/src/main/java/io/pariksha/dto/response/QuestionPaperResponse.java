package io.pariksha.dto.response;

import java.time.LocalDateTime;
import java.util.List;

import io.pariksha.enums.ExamAvailabilityStatus;
import io.pariksha.enums.ExamType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class QuestionPaperResponse {
	
	private Long id;
	private Long createdByUserId;
	private String createdByName;
	private String createdByTeacherCode;
	private String title;
	private String subject;
	private String classLevel;
	private Long classRoomId;
	private String className;
	private String section;
	private ExamType examType;
	private Integer durationMinutes;
	private Integer totalMarks;
	private String instructions;
	private LocalDateTime examStartTime;
	private LocalDateTime examEndTime;
	private ExamAvailabilityStatus availabilityStatus;
	private Long timeRemainingSeconds;
	private boolean aiGenerated;
	private boolean active;
	private List<PaperQuestionResponse> questions;
	private LocalDateTime createdAt;

}
