package io.pariksha.service.impl;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import io.pariksha.dto.request.AddressRequest;
import io.pariksha.dto.request.UpdateStudentRequest;
import io.pariksha.dto.request.UpdateTeacherRequest;
import io.pariksha.dto.response.AddressResponse;
import io.pariksha.dto.response.AdminResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.TeacherResponse;
import io.pariksha.entity.Address;
import io.pariksha.entity.Student;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.repository.ClassRoomRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.ProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileServiceImpl implements ProfileService {
	
	private final UserRepository userRepository;
	private final TeacherRepository teacherRepository;
	private final StudentRepository studentRepository;
	private final ClassRoomRepository classRoomRepository;
	
	@Value("${application.upload.path:uploads/photos}")
	private String uploadPath;

	
	@Override
	public AdminResponse getAdminProfile(Long userId) {

	    User user = userRepository.findById(userId)
	            .orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));

	    return AdminResponse.builder()
	            .id(user.getId())
	            .email(user.getEmail())
	            .role(user.getRole())
	            .status(user.getStatus())
	            .build();
	}
	
	@Override
	public TeacherResponse getTeacherProfile(Long userId) {
		
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
		
		Teacher teacher = teacherRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("Teacher", "userId", userId));
		
		
		return mapToTeacherResponse(teacher, user);
	}

	@Override
	public StudentResponse getStudentProfile(Long userId) {
		
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
		
		Student student = studentRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("StudentProfile", "userId", userId));
		
		return mapToStudentResponse(student, user);
	}
	

	@Override
	@Transactional
	public TeacherResponse updateTeacherProfile(Long userId, UpdateTeacherRequest request) {

	    User user = userRepository.findById(userId)
	            .orElseThrow(() ->
	                new ResourceNotFoundException("User", "id", userId));

	    Teacher teacher = teacherRepository.findByUser(user)
	            .orElseThrow(() ->
	                new ResourceNotFoundException("TeacherProfile", "userId", userId));

	    if (request.getFirstName() != null)
	    	teacher.setFirstName(request.getFirstName());
	    if(request.getLastName() != null)
	    	teacher.setLastName(request.getLastName());
	    if (request.getPhone() != null)
	    	teacher.setPhone(request.getPhone());
	    if (request.getQualifications() != null)
	    	teacher.setQualifications(request.getQualifications());
	    if (request.getExperience() != null)
	    	teacher.setExperience(request.getExperience());

	    if (request.getPermanentAddress() != null) {
	        Address address = buildAddress(request.getPermanentAddress());
	        if (teacher.getPermanentAddress() != null) {
	            Address existing = teacher.getPermanentAddress();
	            existing.setAddressLine(address.getAddressLine());
	            existing.setCity(address.getCity());
	            existing.setState(address.getState());
	            existing.setPincode(address.getPincode());
	            existing.setCountry(address.getCountry());
	        } else {
	        	teacher.setPermanentAddress(address);
	        }
	    }

	    if (request.getCurrentAddress() != null) {
	        Address address = buildAddress(request.getCurrentAddress());
	        if (teacher.getCurrentAddress() != null) {
	            Address existing = teacher.getCurrentAddress();
	            existing.setAddressLine(address.getAddressLine());
	            existing.setCity(address.getCity());
	            existing.setState(address.getState());
	            existing.setPincode(address.getPincode());
	            existing.setCountry(address.getCountry());
	        } else {
	        	teacher.setCurrentAddress(address);
	        }
	    }

	    teacherRepository.save(teacher);

	    return mapToTeacherResponse(teacher, user);
	}


	@Override
	@Transactional
	public StudentResponse updateStudentProfile(
	        Long userId, UpdateStudentRequest request) {

	    User user = userRepository.findById(userId)
	            .orElseThrow(() ->
	                new ResourceNotFoundException("User", "id", userId));

	    Student student = studentRepository.findByUser(user)
	            .orElseThrow(() ->
	                new ResourceNotFoundException("StudentProfile", "userId", userId));

	    if (request.getFirstName() != null)
	    	student.setFirstName(request.getFirstName());
	    if (request.getPhone() != null)
	    	student.setPhone(request.getPhone());
	    if (request.getFatherName() != null)
	    	student.setFatherName(request.getFatherName());
	    if (request.getFatherContact() != null)
	    	student.setFatherContact(request.getFatherContact());
	    if(request.getMotherName() != null)
	    	student.setMotherName(request.getMotherName());

	    // Update permanent address if provided
	    if (request.getPermanentAddress() != null) {
	        Address address = buildAddress(request.getPermanentAddress());
	        if (student.getPermanentAddress() != null) {
	            Address existing = student.getPermanentAddress();
	            existing.setAddressLine(address.getAddressLine());
	            existing.setCity(address.getCity());
	            existing.setState(address.getState());
	            existing.setPincode(address.getPincode());
	            existing.setCountry(address.getCountry());
	        } else {
	        	student.setPermanentAddress(address);
	        }
	    }

	    if (request.getCurrentAddress() != null) {
	        Address address = buildAddress(request.getCurrentAddress());
	        if (student.getCurrentAddress() != null) {
	            Address existing = student.getCurrentAddress();
	            existing.setAddressLine(address.getAddressLine());
	            existing.setCity(address.getCity());
	            existing.setState(address.getState());
	            existing.setPincode(address.getPincode());
	            existing.setCountry(address.getCountry());
	        } else {
	        	student.setCurrentAddress(address);
	        }
	    }

	    studentRepository.save(student);

	    return mapToStudentResponse(student, user);
	}

	@Override
	@Transactional
	public String uploadPhoto(Long userId, MultipartFile file) {
		
		if(file.isEmpty()) {
			throw new BadRequestException("Please select a photo to upload.");
		}
		
		  String contentType = file.getContentType();
	        if (contentType == null ||
	            !contentType.startsWith("image/")) {
	            throw new BadRequestException(
	                "Only image files are allowed (JPG, PNG, etc.).");
	        }
	        
	        if (file.getSize() > 2 * 1024 * 1024) {
	            throw new BadRequestException(
	                "Photo size must not exceed 2MB.");
	        }
	        
	        try {
	            Path uploadDir = Paths.get(uploadPath);
	            Files.createDirectories(uploadDir);

	            String extension = StringUtils.getFilenameExtension(
	                    file.getOriginalFilename());
	            String filename = "user_" + userId + "." + extension;
	            Path filePath = uploadDir.resolve(filename);

	            Files.copy(file.getInputStream(), filePath,
	                    StandardCopyOption.REPLACE_EXISTING);

	            String relativePath = uploadPath + "/" + filename;

	            // Save path to correct profile table
	            savePhotoPath(userId, relativePath);

	            log.info("Photo uploaded for userId={} | path={}", userId, relativePath);

	            return relativePath;

	        } catch (IOException e) {
	            log.error("Photo upload failed for userId={}", userId, e);
	            throw new BadRequestException(
	                "Failed to upload photo. Please try again.");
	        }
	}
	
    private void savePhotoPath(Long userId, String path) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                    new ResourceNotFoundException("User", "id", userId));

        teacherRepository.findByUser(user).ifPresent(p -> {
            p.setPhotoPath(path);
            teacherRepository.save(p);
        });

        studentRepository.findByUser(user).ifPresent(p -> {
            p.setPhotoPath(path);
            studentRepository.save(p);
        });
    }
	
	private TeacherResponse mapToTeacherResponse(Teacher teacher, User user) {
		
		boolean isMentor =
	            classRoomRepository.existsByMentorTeacher(user);
		
		return TeacherResponse.builder()
				              .id(teacher.getId())
				              .userId(user.getId())
				              .teacherCode(teacher.getTeacherCode())
				              .firstName(teacher.getFirstName())
				              .lastName(teacher.getLastName())
				              .gender(teacher.getGender())
				              .email(user.getEmail())
				              .phone(teacher.getPhone())
				              .qualifications(teacher.getQualifications())
				              .experience(teacher.getExperience())
				              .isMentor(isMentor)
				              .permanentAddress(mapToAddressResponse(teacher.getPermanentAddress()))
				              .currentAddress(mapToAddressResponse(teacher.getCurrentAddress()))
				              .photoPath(teacher.getPhotoPath())
				              .createdAt(teacher.getCreatedAt())
				              .updatedAt(teacher.getUpdatedAt())
				              .build();
	}
	
	private StudentResponse mapToStudentResponse(Student student, User user) {
		return StudentResponse.builder()
				               .id(student.getId())
				               .userId(user.getId())
				               .studentRollCode(student.getStudentRollCode())
				               .firstName(student.getFirstName())
				               .lastName(student.getLastName())
				               .email(user.getEmail())
				               .gender(student.getGender())
				               .className(student.getClassName())
				               .section(student.getSection())
				               .permanentAddress(mapToAddressResponse(student.getPermanentAddress()))
				               .currentAddress(mapToAddressResponse(student.getCurrentAddress()))
				               .fatherName(student.getFatherName())
				               .fatherContact(student.getFatherContact())
				               .motherName(student.getMotherName())
				               .photoPath(student.getPhotoPath())
				               .status(user.getStatus())
				               .build();
	}
	
	private AddressResponse mapToAddressResponse(Address address) {
	    if (address == null) return null;
	    return AddressResponse.builder()
	            .id(address.getId())
	            .addressLine(address.getAddressLine())
	            .city(address.getCity())
	            .state(address.getState())
	            .pincode(address.getPincode())
	            .country(address.getCountry())
	            .addressType(address.getAddressType())
	            .build();
	}
	
	private Address buildAddress(AddressRequest req) {
	    if (req == null) return null;
	    return Address.builder()
	            .addressLine(req.getAddressLine())
	            .city(req.getCity())
	            .state(req.getState())
	            .pincode(req.getPincode())
	            .country(req.getCountry() != null ? req.getCountry() : "India")
	            .addressType(req.getAddressType())
	            .build();
	}

}
