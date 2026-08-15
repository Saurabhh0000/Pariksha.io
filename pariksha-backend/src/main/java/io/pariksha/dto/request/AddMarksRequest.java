package io.pariksha.dto.request;

import java.time.LocalDate;

import io.pariksha.enums.ExamType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AddMarksRequest {

	@NotNull(message = "Student is required")
	private Long studentUserId;
	
	@NotBlank(message = "Subject is required")
	private String subject;
	
	@NotNull(message = "Exam type is required")
	private ExamType examType;
	
	@NotNull(message = "Marks obtained is required")
	private Double marksObtained;
	
	@NotNull(message = "Total marks is required")
	private Double totalMarks;
	
	private LocalDate examDate;
}
