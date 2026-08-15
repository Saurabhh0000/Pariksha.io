package io.pariksha.service.impl;

import java.time.Year;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AddressRequest;
import io.pariksha.dto.request.AssignMentorRequest;
import io.pariksha.dto.request.AssignSubjectTeacherRequest;
import io.pariksha.dto.request.CreateClassRequest;
import io.pariksha.dto.request.CreateStudentRequest;
import io.pariksha.dto.request.CreateTeacherRequest;
import io.pariksha.dto.response.AddressResponse;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.SubjectAllocationResponse;
import io.pariksha.dto.response.TeacherResponse;
import io.pariksha.entity.Address;
import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.Student;
import io.pariksha.entity.SubjectAllocation;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;
import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.DuplicateResourceException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.repository.ClassRoomRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.SubjectAllocationRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.AdminService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminServiceImpl implements AdminService{
	
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final StudentRepository studentRepository;
	private final TeacherRepository teacherRepository;
	private final ClassRoomRepository classRoomRepository;
	private final SubjectAllocationRepository subjectAllocationRepository;

	@Override
	@Transactional
	public TeacherResponse createTeacher(CreateTeacherRequest request) {
		
		if(userRepository.existsByEmail(request.getEmail())) {
			throw new DuplicateResourceException("Email "+request.getEmail()+" is already registered");
		}
		
		String teacherCode = generateTeacherCode();
		
		String defaultPassword = "Pariksha@"+teacherCode;
		
		User user = User.builder()
		                .email(request.getEmail())
		                .password(passwordEncoder.encode(defaultPassword))
		                .role(Role.ROLE_TEACHER)
		                .status(UserStatus.ACTIVE)
		                .firstLogin(true)
		                .build();
		
		userRepository.save(user);
		
		Address permanentAddress = buildAddress(request.getPermanentAddress());
		Address currentAddress = buildAddress(request.getCurrentAddress());
		
		Teacher teacher = Teacher.builder()
		       .user(user)
		       .teacherCode(teacherCode)
		       .firstName(request.getFirstName())
		       .lastName(request.getLastName())
		       .gender(request.getGender())
		       .phone(request.getPhone())
		       .qualifications(request.getQualifications())
		       .experience(request.getExperience())
		       .permanentAddress(permanentAddress)
		       .currentAddress(currentAddress)
		       .build();
		
		teacherRepository.save(teacher);
		
        log.info("Teacher created: {} | Code: {}", request.getEmail(), teacherCode);

		
		return mapToTeacherResponse(teacher, user);
	}

	@Override
	@Transactional
	public void removeTeacher(Long userId) {
		
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", userId));
		
		if(user.getRole() != Role.ROLE_TEACHER) {
			throw new BadRequestException("User is not a teacher");
		}
		
		classRoomRepository.findByMentorTeacher(user)
		.ifPresent(classRoom -> {
			              classRoom.setMentorTeacher(null); 
			              classRoomRepository.save(classRoom);
			              });
		
		List<SubjectAllocation> list = subjectAllocationRepository.findByTeacher(user);
		subjectAllocationRepository.deleteAll(list);
		
		
		user.setStatus(UserStatus.INACTIVE);
		userRepository.save(user);
		
        log.info("Teacher deactivated: userId={}", userId);
		
	}

	@Override
	public List<TeacherResponse> getAllTeachers() {
		return teacherRepository.findAll().stream().map(profile -> mapToTeacherResponse(profile, profile.getUser())).collect(Collectors.toList());
	}

	@Override
	@Transactional
	public StudentResponse createStudent(CreateStudentRequest request) {
		
		if(userRepository.existsByEmail(request.getEmail()))
		{
			throw new DuplicateResourceException("Email " + request.getEmail() + " is already registered.");
		}
		
		String rollCode = generateStudentRollCode();
		String defaultPassword = "Pariksha@"+rollCode;
		
		User user = User.builder()
				        .email(request.getEmail())
				        .password(passwordEncoder.encode(defaultPassword))
				        .role(Role.ROLE_STUDENT)
				        .status(UserStatus.ACTIVE)
				        .firstLogin(true)
				        .build();
		
		userRepository.save(user);
		
		Address permanentAddress = buildAddress(request.getPermanentAddress());
		Address currentAddress = buildAddress(request.getCurrentAddress());
		
		Student student = Student.builder()
				                 .user(user)
				                 .firstName(request.getFirstName())
				                 .lastName(request.getLastName())
				                 .gender(request.getGender())
				                 .studentRollCode(rollCode)
				                 .className(request.getClassName())
				                 .section(request.getSection())
				                 .phone(request.getPhone())
				                 .fatherName(request.getFatherName())
				                 .fatherContact(request.getFatherContact())
				                 .motherName(request.getMotherName())
				                 .permanentAddress(permanentAddress)
				                 .currentAddress(currentAddress)
				                 .build();
		
		studentRepository.save(student);
		
        log.info("Student created: {} | Roll: {}", request.getEmail(), rollCode);
				        
		return mapToStudentResponse(student, user);
	}

	@Override
	@Transactional
	public void removeStudent(Long userId) {
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Student", "id", userId));
		
		if(user.getRole() != Role.ROLE_STUDENT)
		{
			throw new BadRequestException("User is not a student");
		}
		user.setStatus(UserStatus.INACTIVE);
		userRepository.save(user);
		
        log.info("Student deactivated: userId={}", userId);
		
	}

	@Override
	public List<StudentResponse> getAllStudents() {
		return studentRepository.findAll().stream().map(profile -> mapToStudentResponse(profile, profile.getUser())).collect(Collectors.toList());
	}

	@Override
	@Transactional
	public void approveStudent(Long userId) {
		
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Student", "id", userId));
		
		if(user.getStatus() != UserStatus.PENDING) {
			throw new BadRequestException("Student is not in PENDING status.");
		}
		String rollCode = generateStudentRollCode();
		String defaultPassword = "Pariksha@"+rollCode;
		
		user.setPassword(passwordEncoder.encode(defaultPassword));
		user.setStatus(UserStatus.ACTIVE);
		user.setFirstLogin(true);
		
		userRepository.save(user);
	
		Student student = studentRepository.findByUser(user).orElseThrow(() -> new ResourceNotFoundException("Student", "userId", userId));
		
		student.setStudentRollCode(rollCode);
		studentRepository.save(student);
		
	}

	@Override
	@Transactional
	public void rejectStudent(Long userId) {
		
		User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Student", "id", userId));
		
		if(user.getStatus() != UserStatus.PENDING) {
			throw new BadRequestException("Student is not in PENDING status.");
		}
		
		user.setStatus(UserStatus.INACTIVE);
		userRepository.save(user);
		
        log.info("Student rejected: userId={}", userId);

		
	}

	@Override
	public List<StudentResponse> getAllPendingStudents() {
		return userRepository.findByRoleAndStatus(Role.ROLE_STUDENT, UserStatus.PENDING)
				.stream()
				.map(user -> {
					Student student = studentRepository.findByUser(user).orElse(null);
					if(student == null) return null;
					return mapToStudentResponse(student, user);
				})
				.filter(r -> r != null)
				.collect(Collectors.toList());
	}
	
	
	 @Override
	 @Transactional
	 public ClassRoomResponse createClass(CreateClassRequest request) {
		 
		 if(classRoomRepository.existsByClassNameAndSection(request.getClassName(), request.getSection())) {
			 throw new DuplicateResourceException("Class " + request.getClassName() +
		                " - " + request.getSection() + " already exists.");
		 }
		 
		 ClassRoom classRoom = ClassRoom.builder()
				                         .className(request.getClassName())
				                         .section(request.getSection())
				                         .build();
		 
		 classRoomRepository.save(classRoom);
		 
		 log.info("Class created: {}-{}", request.getClassName(),
	                request.getSection());
				                            
		return mapToClassRoomResponse(classRoom);
	 }

	 @Override
	 @Transactional
	 public ClassRoomResponse assignMentorTeacher(Long classRoomId, AssignMentorRequest request) {
		 
		 ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		 
		 User teacher = userRepository.findById(request.getTeacherUserId()).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.getTeacherUserId()));
		 
		 if(teacher.getRole() != Role.ROLE_TEACHER) {
			 throw new BadRequestException("Only a teacher can be assigned as mentor.");
		 }
		 
		 if(teacher.getStatus() != UserStatus.ACTIVE) {
			 throw new BadRequestException("Cannot assign inactive teacher as mentor.");
		 }
		 
		 classRoomRepository.findByMentorTeacher(teacher)
		                    .ifPresent(existingClass -> {
		                    	if(!existingClass.getId().equals(classRoomId)) {
		                    		throw new BadRequestException(
		                                    "This teacher is already a mentor of class " +
		                                    existingClass.getClassName() +
		                                    " - " + existingClass.getSection() +
		                                    ". Remove them first.");
		                    	}
		                    });
		 
		 classRoom.setMentorTeacher(teacher);
		 classRoomRepository.save(classRoom);
		 
		 log.info("Mentor assigned: teacher userId={} → class {}-{}",
	                teacher.getId(), classRoom.getClassName(),
	                classRoom.getSection());
		 
		 
		return mapToClassRoomResponse(classRoom);
	 }

	 @Override
	 @Transactional
	 public ClassRoomResponse assignSubjectTeacher(Long classRoomId, AssignSubjectTeacherRequest request) {
		 
		 ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		 
		 User teacher = userRepository.findById(request.getTeacherUserId()).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", request.getTeacherUserId()));
		 
		 if(teacher.getRole() != Role.ROLE_TEACHER) {
			 throw new BadRequestException("Only a teacher can be assigned as subject teacher.");
		 }
		 
		 if(teacher.getStatus() != UserStatus.ACTIVE) {
			 throw new BadRequestException("Cannot assign inactive teacher.");
		 }
		 
		 if(subjectAllocationRepository
			        .existsByClassRoomAndSubject(
			                classRoom,
			                request.getSubject())) {

			    throw new DuplicateResourceException(
			            request.getSubject()
			            + " already has a teacher assigned.");
			}
		 
		 SubjectAllocation subjectAllocation = SubjectAllocation.builder()
		                                                        .teacher(teacher)
		                                                        .classRoom(classRoom)
		                                                        .subject(request.getSubject())
		                                                        .build();
		 
		 subjectAllocationRepository.save(subjectAllocation);
		 
		 log.info("Subject teacher assigned: {} teaches {} in class {}-{}",
	                teacher.getId(), request.getSubject(),
	                classRoom.getClassName(), classRoom.getSection());
		 
		 
		return mapToClassRoomResponse(classRoom);
	 }

	 @Override
	 @Transactional
	 public void removeSubjectTeacher(Long classRoomId, Long teacherUserId, String subject) {
		 
		 ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		 
		 User teacher = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		 
		 SubjectAllocation subjectAllocation = subjectAllocationRepository.findByTeacherAndClassRoomAndSubject(teacher, classRoom, subject).orElseThrow(() -> new ResourceNotFoundException("SubjectAllocation", "teacher+class+subject",
                            teacherUserId + "+" + classRoomId + "+" + subject));
		 
		 subjectAllocationRepository.delete(subjectAllocation);
		 
		 log.info("Subject teacher removed: {} no longer teaches {} in {}-{}",
	                teacherUserId, subject, classRoom.getClassName(),
	                classRoom.getSection());
	 }

	 @Override
	 public List<ClassRoomResponse> getAllClasses() {
		 
		 return classRoomRepository.findAll().stream().map(this::mapToClassRoomResponse).collect(Collectors.toList());
	 }

	 @Override
	 public ClassRoomResponse getClassById(Long classRoomId) {
		 
		 ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));	 
		 
		return mapToClassRoomResponse(classRoom);
	 }
	
	
	
	// All Private Methods are There
	 
	 private ClassRoomResponse mapToClassRoomResponse(ClassRoom classRoom) {
		 
		 Long mentorId = null;
		 String mentorName = null;
		 String mentorCode = null;
		 
		 if(classRoom.getMentorTeacher() != null) {
			 User mentorUser = classRoom.getMentorTeacher();
			 
			  mentorId = mentorUser.getId();
			  
			  teacherRepository.findByUser(mentorUser).ifPresent(t ->{
			  });
			  
			  Teacher mentorProfile = teacherRepository.findByUser(mentorUser).orElse(null);
			  
			  if(mentorProfile != null) {
				  mentorName = mentorProfile.getFirstName() + " " + mentorProfile.getLastName();
				  mentorCode = mentorProfile.getTeacherCode();
			  }
			  
		 }
		        List<SubjectAllocationResponse> subjectTeachers =
		                subjectAllocationRepository.findByClassRoom(classRoom)
		                        .stream()
		                        .map(allocation -> {
		                            Teacher t = teacherRepository
		                                    .findByUser(allocation.getTeacher())
		                                    .orElse(null);
		                            return SubjectAllocationResponse.builder()
		                                    .id(allocation.getId())
		                                    .teacherUserId(allocation.getTeacher().getId())
		                                    .teacherName(t != null
		                                        ? t.getFirstName() + " " + t.getLastName()
		                                        : "Unknown")
		                                    .teacherCode(t != null
		                                        ? t.getTeacherCode() : "")
		                                    .subject(allocation.getSubject())
		                                    .build();
		                        })
		                        .collect(Collectors.toList());		 
		 
		 
			return ClassRoomResponse.builder()
	                .id(classRoom.getId())
	                .className(classRoom.getClassName())
	                .section(classRoom.getSection())
	                .mentorTeacherId(mentorId)
	                .mentorTeacherName(mentorName)
	                .mentorTeacherCode(mentorCode)
	                .subjectTeachers(subjectTeachers)
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
	
    private String generateTeacherCode() {
        int year = Year.now().getValue();
        long count = teacherRepository.count() + 1;
        String code;
        do {
            code = String.format("TCH-%d-%03d", year, count++);
        } while (teacherRepository.existsByTeacherCode(code));
        return code;
    }
    
    private String generateStudentRollCode() {
        int year = Year.now().getValue();
        long count = studentRepository.count() + 1;
        String code;
        do {
            code = String.format("STU-%d-%03d", year, count++);
        } while (studentRepository.existsByStudentRollCode(code));
        return code;
    }
    
    // Mapper
    
    private TeacherResponse mapToTeacherResponse(Teacher teacher, User user) {

    	
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
    			              .phone(student.getPhone())
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


}
