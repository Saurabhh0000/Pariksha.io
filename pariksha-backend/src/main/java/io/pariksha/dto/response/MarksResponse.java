package io.pariksha.dto.response;

import java.time.LocalDateTime;

import io.pariksha.enums.ExamType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Builder
public class MarksResponse {
	
	private Long id;
	private Long studentUserId;
    private String studentName;
    private String studentRollCode;
    private String subject;
    private ExamType examType;
    private Double marksObtained;
    private Double totalMarks;
    private Double percentage;          
    private LocalDateTime examDate;

}
