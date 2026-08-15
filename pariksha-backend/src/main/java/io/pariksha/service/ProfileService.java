package io.pariksha.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import io.pariksha.dto.request.UpdateStudentRequest;
import io.pariksha.dto.request.UpdateTeacherRequest;
import io.pariksha.dto.response.AdminResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TeacherResponse;

@Service
public interface ProfileService {
	
	AdminResponse getAdminProfile(Long userId);
	
	TeacherResponse getTeacherProfile(Long userId);
	StudentResponse getStudentProfile(Long userId);
	
	TeacherResponse updateTeacherProfile(Long userId, UpdateTeacherRequest request);
	StudentResponse updateStudentProfile(Long userId, UpdateStudentRequest request);
	
	String uploadPhoto(Long userId, MultipartFile file);

}
