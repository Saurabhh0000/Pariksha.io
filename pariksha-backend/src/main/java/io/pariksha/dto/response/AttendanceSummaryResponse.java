package io.pariksha.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class AttendanceSummaryResponse {
	
	private Long studentUserId;
	private String studentName;
	private String studentRollCode;
	private int totalDays;
	private int presentDays;
	private int absentDays;
	private int lateDays;
	private int halfDays;
	private double attendancePercentage;
	private String attendanceStatus;

}
