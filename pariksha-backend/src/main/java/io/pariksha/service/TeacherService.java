package io.pariksha.service;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AddMarksRequest;
import io.pariksha.dto.request.MarkAttendanceRequest;
import io.pariksha.dto.request.TeacherAddStudentRequest;
import io.pariksha.dto.request.TimetableRequest;
import io.pariksha.dto.response.ActivityResponse;
import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TimetableResponse;

@Service
public interface TeacherService {
	
	StudentResponse addStudent(Long teacherUserId, TeacherAddStudentRequest request);
	
	List<ClassRoomResponse> getAssignedClasses(Long teacherUserId);
	
	List<StudentResponse> getStudentsInClass(Long teacherUserId, Long classRoomId);
	
 	AttendanceResponse markAttendance(Long teacherUserId, MarkAttendanceRequest request);
 	
 	List<AttendanceResponse> getClassAttendance(Long teacherUserId, Long classRoomId, LocalDate date);
 	
 	MarksResponse addMarks(Long teacherUserId, AddMarksRequest request);
 	
 	MarksResponse updateMarks(Long teacherUserId, Long markId, AddMarksRequest request);
 	
 	List<MarksResponse> getStudentMarks(Long teacherUserId, Long studentUserId);
 	
 	TimetableResponse createTimetable(Long teacherUserId, TimetableRequest request);
 	TimetableResponse updateTimetable(Long teacherUserId, Long timeTableId, TimetableRequest request);
 	
 	void deleteTimetable(Long teacherUserId, Long timeTableId);
 	
 	List<TimetableResponse> getClassTimetable(Long classRoomId);
 	List<TimetableResponse> getMyTimetable(Long teacherUserId);
 	
 	
 	List<ActivityResponse> getRecentActivities(Long teacherUserId);

}
