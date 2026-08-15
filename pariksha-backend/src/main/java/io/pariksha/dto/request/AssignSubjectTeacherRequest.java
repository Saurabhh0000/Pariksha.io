package io.pariksha.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class AssignSubjectTeacherRequest {
	
	@NotNull(message = "Teacher user ID is required")
	private Long teacherUserId;
	
	@NotBlank(message = "Subject is required")
	private String subject;

}
