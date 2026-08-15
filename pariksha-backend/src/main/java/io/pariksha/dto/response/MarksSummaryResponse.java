package io.pariksha.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class MarksSummaryResponse {
	
	private String subject;
	private Double totalMarksObtained;
	private Double totalMaxMarks;
	private Double percentage;
	private String grade;
	private int examsCount;

}
