package io.pariksha.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import io.pariksha.dto.request.AddMarksRequest;
import io.pariksha.dto.request.MarkAttendanceRequest;
import io.pariksha.dto.request.TeacherAddStudentRequest;
import io.pariksha.dto.request.TimetableRequest;
import io.pariksha.dto.response.ActivityResponse;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TimetableResponse;
import io.pariksha.service.TeacherService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/teacher")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_TEACHER')")
public class TeacherController {

    private final TeacherService teacherService;

    @PostMapping("/students")
    public ResponseEntity<ApiResponse<StudentResponse>> addStudent(
            @Valid @RequestBody TeacherAddStudentRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        StudentResponse response =
                teacherService.addStudent(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Student added successfully. " +
                        "Waiting for admin approval.",
                        response));
    }

    @GetMapping("/classes")
    public ResponseEntity<ApiResponse<List<ClassRoomResponse>>> getAssignedClasses(
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<ClassRoomResponse> classes =
                teacherService.getAssignedClasses(teacherUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Classes fetched successfully.", classes));
    }

    @GetMapping("/classes/{classRoomId}/students")
    public ResponseEntity<ApiResponse<List<StudentResponse>>> getStudentsInClass(
            @PathVariable Long classRoomId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<StudentResponse> students =
                teacherService.getStudentsInClass(teacherUserId, classRoomId);

        return ResponseEntity.ok(ApiResponse.success(
                "Students fetched successfully.", students));
    }

    @PostMapping("/attendance")
    public ResponseEntity<ApiResponse<AttendanceResponse>> markAttendance(
            @Valid @RequestBody MarkAttendanceRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        AttendanceResponse response =
                teacherService.markAttendance(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Attendance marked successfully.", response));
    }

    @GetMapping("/attendance/{classRoomId}")
    public ResponseEntity<ApiResponse<List<AttendanceResponse>>> getClassAttendance(
            @PathVariable Long classRoomId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
                LocalDate date,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<AttendanceResponse> list =
                teacherService.getClassAttendance(
                        teacherUserId, classRoomId, date);

        return ResponseEntity.ok(ApiResponse.success(
                "Attendance fetched successfully.", list));
    }


    @PostMapping("/marks")
    public ResponseEntity<ApiResponse<MarksResponse>> addMarks(
            @Valid @RequestBody AddMarksRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        MarksResponse response =
                teacherService.addMarks(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Marks added successfully.", response));
    }

    @PutMapping("/marks/{markId}")
    public ResponseEntity<ApiResponse<MarksResponse>> updateMarks(
            @PathVariable Long markId,
            @Valid @RequestBody AddMarksRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        MarksResponse response =
                teacherService.updateMarks(teacherUserId, markId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Marks updated successfully.", response));
    }

    @GetMapping("/marks/{studentUserId}")
    public ResponseEntity<ApiResponse<List<MarksResponse>>> getStudentMarks(
            @PathVariable Long studentUserId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<MarksResponse> list =
                teacherService.getStudentMarks(teacherUserId, studentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Marks fetched successfully.", list));
    }



    @PostMapping("/timetable")
    public ResponseEntity<ApiResponse<TimetableResponse>> createTimetable(
            @Valid @RequestBody TimetableRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        TimetableResponse response =
                teacherService.createTimetable(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Timetable created successfully.", response));
    }

    @PutMapping("/timetable/{timetableId}")
    public ResponseEntity<ApiResponse<TimetableResponse>> updateTimetable(
            @PathVariable Long timetableId,
            @Valid @RequestBody TimetableRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        TimetableResponse response =
                teacherService.updateTimetable(
                        teacherUserId, timetableId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Timetable updated successfully.", response));
    }

    @DeleteMapping("/timetable/{timetableId}")
    public ResponseEntity<ApiResponse<Void>> deleteTimetable(
            @PathVariable Long timetableId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        teacherService.deleteTimetable(teacherUserId, timetableId);

        return ResponseEntity.ok(ApiResponse.success(
                "Timetable entry deleted successfully."));
    }


    @GetMapping("/timetable/class/{classRoomId}")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> getClassTimetable(
            @PathVariable Long classRoomId) {

        List<TimetableResponse> list =
                teacherService.getClassTimetable(classRoomId);

        return ResponseEntity.ok(ApiResponse.success(
                "Class timetable fetched successfully.", list));
    }

    @GetMapping("/timetable/me")
    public ResponseEntity<ApiResponse<List<TimetableResponse>>> getMyTimetable(
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<TimetableResponse> list =
                teacherService.getMyTimetable(teacherUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Your timetable fetched successfully.", list));
    }
    
    @GetMapping("/activities")
    public ResponseEntity<ApiResponse<List<ActivityResponse>>> getRecentActivities(
            HttpServletRequest httpRequest) {

        Long teacherUserId =
                (Long) httpRequest.getAttribute("userId");

        List<ActivityResponse> activities =
                teacherService.getRecentActivities(teacherUserId);

        return ResponseEntity.ok(
                ApiResponse.success(
                        "Recent activities fetched successfully.",
                        activities
                )
        );
    }
}