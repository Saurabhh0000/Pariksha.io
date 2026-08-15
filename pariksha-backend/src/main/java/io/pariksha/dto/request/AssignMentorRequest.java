package io.pariksha.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AssignMentorRequest {
	
	@NotNull(message = "Teacher user ID is requried")
	private Long teacherUserId;

}
