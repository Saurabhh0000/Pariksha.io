package io.pariksha.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class SubjectAllocationResponse {
	
	private Long id;
	private Long teacherUserId;
	private String teacherName;
	private String teacherCode;
	private String subject;

}
