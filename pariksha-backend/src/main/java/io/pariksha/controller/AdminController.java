package io.pariksha.controller;

import java.util.List;

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

import io.pariksha.dto.request.AssignMentorRequest;
import io.pariksha.dto.request.AssignSubjectTeacherRequest;
import io.pariksha.dto.request.CreateClassRequest;
import io.pariksha.dto.request.CreateStudentRequest;
import io.pariksha.dto.request.CreateTeacherRequest;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TeacherResponse;
import io.pariksha.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminController {
	
	private final AdminService adminService;
	
	@PostMapping("/teachers")
	public ResponseEntity<ApiResponse<TeacherResponse>> createTeacher(@Valid @RequestBody CreateTeacherRequest request){
		
		TeacherResponse teacher = adminService.createTeacher(request);
		
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Teacher created successfully.", teacher));
	}
	
	@GetMapping("/teachers")
	public ResponseEntity<ApiResponse<List<TeacherResponse>>> getAllTeachers(){
		
		List<TeacherResponse> allTeachers = adminService.getAllTeachers();
		
		return ResponseEntity.ok(ApiResponse.success("Teachers fetched successfully.", allTeachers));
	}
	
	@DeleteMapping("/teachers/{userId}")
	public ResponseEntity<ApiResponse<Void>> removeTeacher(@PathVariable Long userId){
		
		adminService.removeTeacher(userId);
		
		return ResponseEntity.ok(ApiResponse.success("Teacher removed successfully."));
		
	}
	
	@PostMapping("/students")
	public ResponseEntity<ApiResponse<StudentResponse>> createStudent(@Valid @RequestBody CreateStudentRequest request){
		
		StudentResponse student = adminService.createStudent(request);
		
		return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success("Student created successfully.", student));
	}
	
	@GetMapping("/students")
	public ResponseEntity<ApiResponse<List<StudentResponse>>> getAllStudents()
	{
		List<StudentResponse> allStudents = adminService.getAllStudents();
		
		return ResponseEntity.ok(ApiResponse.success("Students fetched successfully.", allStudents));
	}
	
	@DeleteMapping("/students/{userId}")
	public ResponseEntity<ApiResponse<StudentResponse>> removeStudent(@PathVariable Long userId){
		adminService.removeStudent(userId);
		
		return ResponseEntity.ok(ApiResponse.success("Student removed successfully."));
	}
	
	@GetMapping("/students/pending")
	public ResponseEntity<ApiResponse<List<StudentResponse>>> getPendingStudents(){
		List<StudentResponse> allPendingStudents = adminService.getAllPendingStudents();
		
		return ResponseEntity.ok(ApiResponse.success("Pending students fetched.", allPendingStudents));
	}
	
	@PutMapping("/students/{userId}/approve")
	public ResponseEntity<ApiResponse<Void>> approveStudent(@PathVariable Long userId){
		adminService.approveStudent(userId);
		
		return ResponseEntity.ok(ApiResponse.success("Student approved successfully."));
	}
	
	@PutMapping("/students/{userId}/reject")
	public ResponseEntity<ApiResponse<Void>> rejectStudent(@PathVariable Long userId){
		adminService.rejectStudent(userId);
		
		return ResponseEntity.ok(ApiResponse.success("Student rejected."));
	}
	
	
	
	// Class Management Endpoints
	
	@PostMapping("/classes")
	public ResponseEntity<ApiResponse<ClassRoomResponse>> createClass(@Valid @RequestBody CreateClassRequest request){
		ClassRoomResponse classRoomResponse = adminService.createClass(request);
		
		return ResponseEntity.ok(ApiResponse.success("Class created successfully.", classRoomResponse));
	}
	
	@GetMapping("/classes")
	public ResponseEntity<ApiResponse<List<ClassRoomResponse>>> getAllClasses(){
		List<ClassRoomResponse> allClasses = adminService.getAllClasses();
		
		return ResponseEntity.ok(ApiResponse.success("Classes fetched successfully.", allClasses));
	}
	
	@GetMapping("/classes/{classRoomId}")
	public ResponseEntity<ApiResponse<ClassRoomResponse>> getClassById(@PathVariable Long classRoomId){
		ClassRoomResponse classById = adminService.getClassById(classRoomId);
		return ResponseEntity.ok(ApiResponse.success("Class fetched successfully.", classById));
	}
	
	@PutMapping("/classes/{classRoomId}/mentor")
	public ResponseEntity<ApiResponse<ClassRoomResponse>> assignMentor(@PathVariable Long classRoomId,@Valid @RequestBody AssignMentorRequest request) {
		ClassRoomResponse assignMentorTeacher = adminService.assignMentorTeacher(classRoomId, request);
		return ResponseEntity.ok(ApiResponse.success("Mentor teacher assigned successfully.", assignMentorTeacher));
	}
	
	@PostMapping("/classes/{classRoomId}/subjects")
	public ResponseEntity<ApiResponse<ClassRoomResponse>> assignSubjectTeacher(@PathVariable Long classRoomId,@Valid @RequestBody AssignSubjectTeacherRequest request) {
		ClassRoomResponse assignSubjectTeacher = adminService.assignSubjectTeacher(classRoomId, request);
		return ResponseEntity.ok(ApiResponse.success("Subject teacher assigned successfully.",assignSubjectTeacher));
	}
	
	@DeleteMapping("/classes/{classRoomId}/subjects/{teacherUserId}")
	public ResponseEntity<ApiResponse<ClassRoomResponse>> removeSubjectTeacher(@PathVariable Long classRoomId,@PathVariable Long teacherUserId,@RequestParam String subject){
		adminService.removeSubjectTeacher(classRoomId, teacherUserId, subject);
		
		return ResponseEntity.ok(ApiResponse.success("Subject teacher removed successfully."));
	}

}
