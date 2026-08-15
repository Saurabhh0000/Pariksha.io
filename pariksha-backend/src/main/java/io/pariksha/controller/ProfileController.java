package io.pariksha.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.pariksha.dto.request.UpdateStudentRequest;
import io.pariksha.dto.request.UpdateTeacherRequest;
import io.pariksha.dto.response.AdminResponse;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TeacherResponse;
import io.pariksha.entity.User;
import io.pariksha.enums.Role;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.ProfileService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {
	
	private final ProfileService profileService;
	private final UserRepository userRepository;
	
	@GetMapping("/me")
	public ResponseEntity<ApiResponse<?>> getProfile(HttpServletRequest request){

	    Long userId = (Long) request.getAttribute("userId");
	    User user = userRepository.findById(userId).orElseThrow();

	    if (user.getRole() == Role.ROLE_ADMIN) {
	        AdminResponse adminProfile = profileService.getAdminProfile(userId);
	        return ResponseEntity.ok(ApiResponse.success("Profile fetched.", adminProfile));
	    }

	    if (user.getRole() == Role.ROLE_TEACHER) {
	        TeacherResponse teacherProfile = profileService.getTeacherProfile(userId);
	        return ResponseEntity.ok(ApiResponse.success("Profile fetched.", teacherProfile));
	    }

	    StudentResponse studentProfile = profileService.getStudentProfile(userId);
	    return ResponseEntity.ok(ApiResponse.success("Profile fetched.", studentProfile));
	}
	
	@PutMapping("/teacher")
	public ResponseEntity<ApiResponse<TeacherResponse>> updateTeacherProfile(HttpServletRequest request,@RequestBody UpdateTeacherRequest updateRequest){
		Long userId = (Long) request.getAttribute("userId");
		
		TeacherResponse updateTeacherProfile = profileService.updateTeacherProfile(userId, updateRequest);
		return ResponseEntity.ok(ApiResponse.success("Profile updated successfully.", updateTeacherProfile));
	}
	
	@PutMapping("/student")
	public ResponseEntity<ApiResponse<StudentResponse>> updateStudentProfile(HttpServletRequest request, @RequestBody UpdateStudentRequest updateRequest){

		Long userId = (Long) request.getAttribute("userId");
		StudentResponse updateStudentProfile = profileService.updateStudentProfile(userId, updateRequest);
		return ResponseEntity.ok(ApiResponse.success("Profile updated successfully.", updateStudentProfile));
	}
	
	@PostMapping("/photo")
	public ResponseEntity<ApiResponse<String>> uploadPhoto(@RequestParam("photo") MultipartFile file, HttpServletRequest request){
		
		Long userId = (Long) request.getAttribute("userId");
		String path = profileService.uploadPhoto(userId, file);
		
		return ResponseEntity.ok(ApiResponse.success("Photo uploaded successfully.", path));
		
	}

}
