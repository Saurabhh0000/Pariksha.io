package io.pariksha.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.AttendanceSummaryResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.MarksSummaryResponse;
import io.pariksha.dto.response.QuestionPaperResponse;
import io.pariksha.dto.response.TimetableResponse;

@Service
public interface StudentService {
	
	List<AttendanceResponse> getMyAttendance(Long studentUserId);
	
	AttendanceSummaryResponse getMyAttendanceSummary(Long studentUserId);
	
	List<MarksResponse> getMyMarks(Long studentUserId);
	
	List<MarksSummaryResponse> getMyMarksSummary(Long studentUserId);
	
	List<TimetableResponse> getMyTimetable(Long studentUserId);
	
	List<QuestionPaperResponse> getMyPapers(Long studentUserId);

}
