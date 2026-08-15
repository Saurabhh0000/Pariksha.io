package io.pariksha.dto.response;

import java.time.LocalDate;

import io.pariksha.enums.AttendanceStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class AttendanceResponse {
	
	private Long id;
	private Long studentUserId;
	private String studentName;
	private String studentRollCode;
	private Long classRoomId;
	private String className;
	private String section;
	private LocalDate date;
	private AttendanceStatus status;

}
