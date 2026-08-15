package io.pariksha.dto.response;

import java.util.List;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class ClassRoomResponse {
	
	private Long id;
	private String className;
	private String section;
	
	private Long totalStudents;
	
	private Long mentorTeacherId;
    private String mentorTeacherName;
    private String mentorTeacherCode;

    private List<SubjectAllocationResponse> subjectTeachers;

}
