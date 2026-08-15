package io.pariksha.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AssignMentorRequest;
import io.pariksha.dto.request.AssignSubjectTeacherRequest;
import io.pariksha.dto.request.CreateClassRequest;
import io.pariksha.dto.request.CreateStudentRequest;
import io.pariksha.dto.request.CreateTeacherRequest;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TeacherResponse;

@Service
public interface AdminService {
	
	TeacherResponse createTeacher(CreateTeacherRequest request);
	void removeTeacher(Long userId);
	List<TeacherResponse> getAllTeachers();
	
	StudentResponse createStudent(CreateStudentRequest request);
	void removeStudent(Long userId);
	List<StudentResponse> getAllStudents();
	void approveStudent(Long userId);
	void rejectStudent(Long userId);
	List<StudentResponse> getAllPendingStudents();
	
	ClassRoomResponse createClass(CreateClassRequest request);
	ClassRoomResponse assignMentorTeacher(Long classRoomId, AssignMentorRequest request);
	ClassRoomResponse assignSubjectTeacher(Long classRoomId, AssignSubjectTeacherRequest request);
	void removeSubjectTeacher(Long classRoomId, Long teacherUserId, String subject);
	
	List<ClassRoomResponse> getAllClasses();
	ClassRoomResponse getClassById(Long classRoomId);

}
