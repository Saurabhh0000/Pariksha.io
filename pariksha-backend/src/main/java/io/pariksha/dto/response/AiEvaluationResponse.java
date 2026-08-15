package io.pariksha.dto.response;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AiEvaluationResponse {
	
	private Double suggestedMarks;
	
	private String feedback;
	
	private Integer confidenceScore;
	
	private String keyPointsCovered;
	
	private String keyPointsMissed;

}
