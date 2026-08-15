package io.pariksha.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.AttendanceSummaryResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.MarksSummaryResponse;
import io.pariksha.dto.response.QuestionPaperResponse;
import io.pariksha.dto.response.TimetableResponse;
import io.pariksha.service.StudentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_STUDENT')")
public class StudentController {
	
	private final StudentService studentService;
	
	@GetMapping("/attendance")
	public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getMyAttendance(HttpServletRequest httpRequest){
		
		Long studentUserId = (Long) httpRequest.getAttribute("userId");
		
		List<AttendanceResponse> myAttendance = studentService.getMyAttendance(studentUserId);
		
		return ResponseEntity.ok(ApiResponse.success("Attendance fetched successfully.",myAttendance));
	}
	
	@GetMapping("/attendance/summary")
	public ResponseEntity<ApiResponse<AttendanceSummaryResponse>> getMyAttendanceSummary(HttpServletRequest httpRequest) {
		
		Long studentUserId = (Long) httpRequest.getAttribute("userId");
		
		AttendanceSummaryResponse myAttendanceSummary = studentService.getMyAttendanceSummary(studentUserId);
		
		return ResponseEntity.ok(ApiResponse.success("Attendance summary fetched successfully.", myAttendanceSummary));
		
	}
	
	@GetMapping("/marks")
	public ResponseEntity<ApiResponse<List<MarksResponse>>> getMyMarks(HttpServletRequest httpRequest) {
		
		Long studentUserId = (Long) httpRequest.getAttribute("userId");
		
		List<MarksResponse> myMarks = studentService.getMyMarks(studentUserId);
		
		return ResponseEntity.ok(ApiResponse.success("Marks fetched successfully.", myMarks));
	}
	
	@GetMapping("/marks/summary")
	public ResponseEntity<ApiResponse<List<MarksSummaryResponse>>> getMyMarksSummary(HttpServletRequest httpRequest) {
		
		Long studentUserId = (Long) httpRequest.getAttribute("userId");
		
		List<MarksSummaryResponse> marksSummary = studentService.getMyMarksSummary(studentUserId);
		
		return ResponseEntity.ok(ApiResponse.success("Marks summary fetched successfully.",marksSummary));
	}
	
	@GetMapping("/timetable")
	public ResponseEntity<ApiResponse<List<TimetableResponse>>> getMyTimetable(HttpServletRequest httpRequest) {
		
		Long studentUserId = (Long) httpRequest.getAttribute("userId");
		
		List<TimetableResponse> myTimetable = studentService.getMyTimetable(studentUserId);
		
		return ResponseEntity.ok(ApiResponse.success("Timetable fetched successfully.", myTimetable));
	}
	
	@GetMapping("/papers")
	public ResponseEntity<ApiResponse<List<QuestionPaperResponse>>> getMyPapers(HttpServletRequest httpRequest) {

	    Long studentUserId = (Long) httpRequest.getAttribute("userId");

	    List<QuestionPaperResponse> list =
	            studentService.getMyPapers(studentUserId);

	    return ResponseEntity.ok(ApiResponse.success(
	            "Papers fetched successfully.", list));
	}

}
