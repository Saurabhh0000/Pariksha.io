package io.pariksha.service.impl;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AddMarksRequest;
import io.pariksha.dto.request.AddressRequest;
import io.pariksha.dto.request.MarkAttendanceRequest;
import io.pariksha.dto.request.TeacherAddStudentRequest;
import io.pariksha.dto.request.TimetableRequest;
import io.pariksha.dto.response.ActivityResponse;
import io.pariksha.dto.response.AddressResponse;
import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.ClassRoomResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.StudentResponse;
import io.pariksha.dto.response.SubjectAllocationResponse;
import io.pariksha.dto.response.TimetableResponse;
import io.pariksha.entity.Address;
import io.pariksha.entity.Attendance;
import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.Marks;
import io.pariksha.entity.Student;
import io.pariksha.entity.SubjectAllocation;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.Timetable;
import io.pariksha.entity.User;
import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.DuplicateResourceException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.exceptions.UnauthorizedException;
import io.pariksha.repository.AttendanceRepository;
import io.pariksha.repository.ClassRoomRepository;
import io.pariksha.repository.MarksRepository;
import io.pariksha.repository.QuestionPaperRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.SubjectAllocationRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.TimetableRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.TeacherService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class TeacherServiceImpl implements TeacherService {
	
	private final TeacherRepository teacherRepository;
	private final StudentRepository studentRepository;
	private final UserRepository userRepository;
	private final ClassRoomRepository classRoomRepository;
	private final AttendanceRepository attendanceRepository;
	private final MarksRepository marksRepository;
	private final TimetableRepository timeTableRepository;
	private final QuestionPaperRepository questionPaperRepository;
	private final PasswordEncoder passwordEncoder;
	private final SubjectAllocationRepository subjectAllocationRepository;
	
	
	@Override
	public StudentResponse addStudent(Long teacherUserId, TeacherAddStudentRequest request) {
		
		Teacher teacher = teacherRepository.findByUserId(teacherUserId)
			    .orElseThrow(() ->
			        new ResourceNotFoundException("Teacher", "userId", teacherUserId));
		
		if(userRepository.existsByEmail(request.getEmail())) {
			throw new DuplicateResourceException("Email " + request.getEmail() + " is already registered.");
		}
		
		ClassRoom classRoom = classRoomRepository.findByClassNameAndSection(request.getClassName(), request.getSection())
		.orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "className+section",
                request.getClassName() + "-" + request.getSection()));
		
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher of class " +
	                request.getClassName() + "-" + request.getSection() +
	                " can add students.");
		}
		
	    User studentUser = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode("TEMP_PENDING"))
                .role(Role.ROLE_STUDENT)
                .status(UserStatus.PENDING)
                .firstLogin(true)
                .build();
	    
	    userRepository.save(studentUser);
	    
	    Address permanentAddress = buildAddress(request.getPermanentAddress());
	    Address currentAddress = buildAddress(request.getCurrentAddress());
	    
	    Student student = Student.builder()
	    .user(studentUser)
	    .studentRollCode("PENDING-"+studentUser.getId())
	    .firstName(request.getFirstName())
	    .lastName(request.getLastName())
	    .createdBy(teacher.getUser())
	    .gender(request.getGender())
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
	    
	    log.info("Student added by mentor teacher {} → PENDING | email: {}",
                teacherUserId, request.getEmail());
	    
	    
	    
	    return mapToStudentResponse(student, studentUser);
	}

	@Override
	public List<ClassRoomResponse> getAssignedClasses(Long teacherUserId) {

	    User teacher = userRepository.findById(teacherUserId)
	            .orElseThrow(() ->
	                    new ResourceNotFoundException(
	                            "Teacher",
	                            "id",
	                            teacherUserId));

	    List<ClassRoom> assignedClasses = new ArrayList<>();

	    // Mentor classes
	    classRoomRepository.findByMentorTeacher(teacher)
	            .ifPresent(assignedClasses::add);

	    // Subject teacher classes
	    List<SubjectAllocation> allocations =
	            subjectAllocationRepository.findByTeacher(teacher);

	    allocations.forEach(allocation -> {
	        ClassRoom classRoom = allocation.getClassRoom();

	        boolean alreadyAdded =
	                assignedClasses.stream()
	                        .anyMatch(c ->
	                                c.getId().equals(classRoom.getId()));

	        if (!alreadyAdded) {
	            assignedClasses.add(classRoom);
	        }
	    });

	    return assignedClasses.stream()
	            .map(this::mapToClassRoomResponse)
	            .collect(Collectors.toList());
	}

	@Override
	public List<StudentResponse> getStudentsInClass(Long teacherUserId, Long classRoomId) {
		
		User user = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		
		boolean isMentor = classRoom.getMentorTeacher() != null && classRoom.getMentorTeacher().getId().equals(teacherUserId);
		boolean isSubjectTeacher = subjectAllocationRepository.existsByTeacherAndClassRoom(user, classRoom);
		
		if(!isMentor && !isSubjectTeacher) {
			throw new UnauthorizedException("You are not assigned to this class.");
		}
		
		return studentRepository.findByClassNameAndSection(classRoom.getClassName(), classRoom.getSection())
				.stream().map(s -> mapToStudentResponse(s, s.getUser())).collect(Collectors.toList());
	}

	@Override
	@Transactional
	public AttendanceResponse markAttendance(Long teacherUserId, MarkAttendanceRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId()).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));
		
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher of this class can mark attendance.");
			
		}
		
		User studentUser = userRepository.findById(request.getStudentUserId()).orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentUserId()));
		
		attendanceRepository.findByUserAndDate(studentUser, request.getDate()).ifPresent(existing ->{
			throw new DuplicateResourceException("Attendance already marked for this student on "
                        + request.getDate());
		});
		
		Attendance attendance = Attendance.builder()
		.user(studentUser)
		.markedBy(teacherUser)
		.classRoom(classRoom)
		.date(request.getDate())
		.status(request.getStatus())
		.role(Role.ROLE_STUDENT)
		.build();
		
		attendanceRepository.save(attendance);
		
		Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                    "StudentProfile", "userId", studentUser.getId()));

        log.info("Attendance marked: student={} | date={} | status={}",
                studentUser.getId(), request.getDate(), request.getStatus());

        return mapToAttendanceResponse(attendance, student, classRoom);
	}

	@Override
	public List<AttendanceResponse> getClassAttendance(Long teacherUserId, Long classRoomId, LocalDate date) {
		User teacher = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher can view attendance.");
		}
		
		
        return attendanceRepository.findByClassRoomAndDate(classRoom, date)
                .stream()
                .map(att -> {
                    Student student = studentRepository
                            .findByUser(att.getUser()).orElse(null);
                    if (student == null) return null;
                    return mapToAttendanceResponse(att, student, classRoom);
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());
	}

	@Override
	@Transactional
	public MarksResponse addMarks(Long teacherUserId, AddMarksRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		User studentUser = userRepository.findById(request.getStudentUserId()).orElseThrow(() -> new ResourceNotFoundException("Student", "id", request.getStudentUserId()));
		
		Student student = studentRepository.findByUser(studentUser).orElseThrow(() -> new ResourceNotFoundException("StudentProfile", "userId", studentUser.getId()));
		
		ClassRoom classRoom = classRoomRepository.findByClassNameAndSection(student.getClassName(), student.getSection()).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "className+section",
                    student.getClassName() + "-" + student.getSection()));
		
		if(!subjectAllocationRepository.existsByTeacherAndClassRoomAndSubject(teacherUser, classRoom, request.getSubject())) {
			
			boolean isMentor = classRoom.getMentorTeacher() != null && classRoom.getMentorTeacher().getId().equals(teacherUserId);
			
			if(!isMentor) {
				throw new UnauthorizedException("You are not assigned to teach " +
	                    request.getSubject() + " in this class.");
			}
		}
		
		if(request.getMarksObtained() > request.getTotalMarks()) {
			throw new BadRequestException("Marks obtained cannot be greater than total marks.");
		}
		
		Marks marks = Marks.builder()
		.student(studentUser)
		.uploadedBy(teacherUser)
		.subject(request.getSubject())
		.examType(request.getExamType())
		.marksObtained(request.getMarksObtained())
		.totalMarks(request.getTotalMarks())
		.examDate(request.getExamDate() != null ? request.getExamDate().atStartOfDay() : null)
		.build();
		
		marksRepository.save(marks);
		
		log.info("Marks added: student={} | subject={} | {}/{}",
                studentUser.getId(), request.getSubject(),
                request.getMarksObtained(), request.getTotalMarks());
		
		return mapToMarksResponse(marks, student);
	}

	@Override
	@Transactional
	public MarksResponse updateMarks(Long teacherUserId, Long markId, AddMarksRequest request) {
		
		userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		Marks marks = marksRepository.findById(markId).orElseThrow(() -> new ResourceNotFoundException("Marks", "id", markId));
		
		if(request.getMarksObtained() > request.getTotalMarks()) {
			throw new BadRequestException("Marks obtained cannot be greater than total marks.");
		}
		
		marks.setSubject(request.getSubject());
		marks.setExamType(request.getExamType());
		marks.setMarksObtained(request.getMarksObtained());
		marks.setTotalMarks(request.getTotalMarks());
		marksRepository.save(marks);
		
        Student student = studentRepository
                .findByUser(marks.getStudent())
                .orElseThrow(() -> new ResourceNotFoundException(
                    "StudentProfile", "userId",
                    marks.getStudent().getId()));
        
		return mapToMarksResponse(marks, student);
	}

	@Override
	public List<MarksResponse> getStudentMarks(Long teacherUserId, Long studentUserId) {
		
		userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		User studentUser = userRepository.findById(studentUserId).orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentUserId));
		
		Student student = studentRepository.findByUser(studentUser).orElseThrow(() -> new ResourceNotFoundException("StudentProfile", "userId", studentUserId));
		
		return marksRepository.findByStudent(studentUser)
				.stream()
				.map(m -> mapToMarksResponse(m, student))
				.collect(Collectors.toList());
	}

	@Override
	@Transactional
	public TimetableResponse createTimetable(Long teacherUserId, TimetableRequest request) {
		
		User teacher = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository.findById(request.getClassRoomId()).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", request.getClassRoomId()));
		
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher can create timetable for this class.");
		}
		
		List<Timetable> classEntries =
		        timeTableRepository.findByClassRoomAndDay(
		                classRoom,
		                request.getDay());

		boolean classConflict =
		        classEntries.stream()
		                .anyMatch(tt ->
		                        request.getTimeSlotStart()
		                                .isBefore(tt.getTimeSlotEnd())
		                        &&
		                        request.getTimeSlotEnd()
		                                .isAfter(tt.getTimeSlotStart()));

		if (classConflict) {
		    throw new BadRequestException(
		            "Time slot overlaps with existing timetable.");
		}
		
		SubjectAllocation allocation =
		        subjectAllocationRepository
		            .findByClassRoomAndSubject(
		                    classRoom,
		                    request.getSubject())
		            .orElseThrow(() ->
		                    new BadRequestException(
		                            "No teacher assigned for subject "
		                                    + request.getSubject()));

		User subjectTeacherUser = allocation.getTeacher();
		
		List<Timetable> teacherEntries =
		        timeTableRepository.findByTeacherAndDay(
		                subjectTeacherUser,
		                request.getDay());

		boolean teacherConflict =
		        teacherEntries.stream()
		                .anyMatch(tt ->
		                        request.getTimeSlotStart()
		                                .isBefore(tt.getTimeSlotEnd())
		                        &&
		                        request.getTimeSlotEnd()
		                                .isAfter(tt.getTimeSlotStart()));

		if (teacherConflict) {
		    throw new BadRequestException(
		            "Teacher already has another class during this time slot.");
		}
		
		log.info(
			    "Subject = {}, TeacherId = {}",
			    request.getSubject(),
			    subjectTeacherUser.getId()
			);
		
		Timetable timetable = Timetable.builder()
		.classRoom(classRoom)
		.teacher(subjectTeacherUser)
		.day(request.getDay())
		.subject(request.getSubject())
		.timeSlotStart(request.getTimeSlotStart())
		.timeSlotEnd(request.getTimeSlotEnd())
		.roomNumber(request.getRoomNumber())
		.build();
		
		timeTableRepository.save(timetable);
		
		
		
		Teacher teacherProfile =
		        teacherRepository.findByUser(subjectTeacherUser)
		                .orElseThrow(() ->
		                        new ResourceNotFoundException(
		                                "TeacherProfile",
		                                "userId",
		                                subjectTeacherUser.getId()));

        log.info("Timetable created: {}-{} | {} | {}",
                classRoom.getClassName(), classRoom.getSection(),
                request.getDay(), request.getSubject());

        return mapToTimetableResponse(timetable, classRoom);
        
	}

	@Override
	@Transactional
	public TimetableResponse updateTimetable(Long teacherUserId, Long timeTableId, TimetableRequest request) {
		
		User teacher = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		Timetable timetable = timeTableRepository.findById(timeTableId).orElseThrow(() -> new ResourceNotFoundException("Timetable", "id", timeTableId));
		
		ClassRoom classRoom = timetable.getClassRoom();
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher can update this timetable.");
		}
		
		SubjectAllocation allocation =
		        subjectAllocationRepository
		            .findByClassRoomAndSubject(
		                    classRoom,
		                    request.getSubject())
		            .orElseThrow(() ->
		                    new BadRequestException(
		                            "No teacher assigned for subject "
		                                    + request.getSubject()));
		
		List<Timetable> classEntries =
		        timeTableRepository.findByClassRoomAndDay(
		                classRoom,
		                request.getDay());

		boolean classConflict =
		        classEntries.stream()
		                .filter(tt -> !tt.getId().equals(timeTableId))
		                .anyMatch(tt ->
		                        request.getTimeSlotStart()
		                                .isBefore(tt.getTimeSlotEnd())
		                        &&
		                        request.getTimeSlotEnd()
		                                .isAfter(tt.getTimeSlotStart()));

		if (classConflict) {
		    throw new BadRequestException(
		            "Time slot overlaps with existing timetable.");
		}
		
		
		List<Timetable> teacherEntries =
		        timeTableRepository.findByTeacherAndDay(
		                allocation.getTeacher(),
		                request.getDay());

		boolean teacherConflict =
		        teacherEntries.stream()
		                .filter(tt -> !tt.getId().equals(timeTableId))
		                .anyMatch(tt ->
		                        request.getTimeSlotStart()
		                                .isBefore(tt.getTimeSlotEnd())
		                        &&
		                        request.getTimeSlotEnd()
		                                .isAfter(tt.getTimeSlotStart()));

		if (teacherConflict) {
		    throw new BadRequestException(
		            "Teacher already has another class during this time slot.");
		}
		
        timetable.setDay(request.getDay());
        timetable.setTeacher(
                allocation.getTeacher());
        timetable.setSubject(request.getSubject());
        timetable.setTimeSlotStart(request.getTimeSlotStart());
        timetable.setTimeSlotEnd(request.getTimeSlotEnd());
        timetable.setRoomNumber(request.getRoomNumber());
        timeTableRepository.save(timetable);

        Teacher teacherProfile =
                teacherRepository.findByUser(
                        allocation.getTeacher())
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "TeacherProfile",
                                        "userId",
                                        allocation.getTeacher().getId()));

        return mapToTimetableResponse(timetable, classRoom);
	}

	@Override
	@Transactional
	public void deleteTimetable(Long teacherUserId, Long timeTableId) {
		Timetable timetable = timeTableRepository.findById(timeTableId).orElseThrow(() -> new ResourceNotFoundException("Timetable", "id", timeTableId));
		
		ClassRoom classRoom = timetable.getClassRoom();
		
		if(classRoom.getMentorTeacher() == null || !classRoom.getMentorTeacher().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("Only the mentor teacher can delete this timetable entry.");
		}
		
		timeTableRepository.delete(timetable);
		
		log.info("Timetable deleted: id={}", timeTableId);
		
	}

	@Override
	public List<TimetableResponse> getClassTimetable(Long classRoomId) {
		
		
		
		ClassRoom classRoom = classRoomRepository.findById(classRoomId).orElseThrow(() -> new ResourceNotFoundException("ClassRoom", "id", classRoomId));
		
		
		return timeTableRepository.findByClassRoomOrderByDayAscTimeSlotStartAsc(classRoom)
		        .stream()
		        .map(tt -> mapToTimetableResponse(
		                tt,
		                classRoom))
		        .collect(Collectors.toList());
	}

	@Override
	public List<TimetableResponse> getMyTimetable(Long teacherUserId) {

	    User teacher = userRepository.findById(teacherUserId)
	            .orElseThrow(() ->
	                    new ResourceNotFoundException(
	                            "Teacher",
	                            "id",
	                            teacherUserId));

	    return timeTableRepository.findByTeacher(teacher)
	            .stream()
	            .map(tt -> mapToTimetableResponse(
	                    tt,
	                    tt.getClassRoom()))
	            .collect(Collectors.toList());
	}
    
    @Override
    public List<ActivityResponse> getRecentActivities(Long teacherUserId) {

        User teacher = userRepository.findById(teacherUserId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Teacher", "id", teacherUserId));

        List<ActivityResponse> activities = new ArrayList<>();

        // Students Added
        studentRepository
                .findTop5ByCreatedByOrderByCreatedAtDesc(teacher)
                .forEach(student ->
                        activities.add(
                                buildActivity(
                                        "STUDENT",
                                        "Student Added",
                                        student.getFirstName() + " "
                                                + student.getLastName()
                                                + " was added to "
                                                + student.getClassName()
                                                + "-"
                                                + student.getSection(),
                                        student.getCreatedAt()
                                )
                        ));

        // Attendance Marked
        attendanceRepository
                .findTop5ByMarkedByOrderByMarkedAtDesc(teacher)
                .forEach(att -> {

                    Student student =
                            studentRepository.findByUser(att.getUser())
                                    .orElse(null);

                    if (student != null) {
                        activities.add(
                                buildActivity(
                                        "ATTENDANCE",
                                        "Attendance Marked",
                                        "Attendance marked for "
                                                + student.getFirstName()
                                                + " "
                                                + student.getLastName(),
                                        att.getMarkedAt()
                                )
                        );
                    }
                });

        // Marks Uploaded
        marksRepository
                .findTop5ByUploadedByOrderByCreatedAtDesc(teacher)
                .forEach(mark -> {

                    Student student =
                            studentRepository.findByUser(mark.getStudent())
                                    .orElse(null);

                    if (student != null) {
                        activities.add(
                                buildActivity(
                                        "MARKS",
                                        "Marks Uploaded",
                                        mark.getSubject()
                                                + " marks uploaded for "
                                                + student.getFirstName()
                                                + " "
                                                + student.getLastName(),
                                        mark.getCreatedAt()
                                )
                        );
                    }
                });

        // Question Papers
        questionPaperRepository
                .findTop5ByCreatedByAndActiveTrueOrderByCreatedAtDesc(teacher)
                .forEach(paper ->
                        activities.add(
                                buildActivity(
                                        "PAPER",
                                        "Question Paper Created",
                                        paper.getTitle(),
                                        paper.getCreatedAt()
                                )
                        ));

        return activities.stream()
                .sorted((a, b) ->
                        b.getCreatedAt().compareTo(a.getCreatedAt()))
                .limit(10)
                .toList();
    }
    
    // All Private Methods
    
    
    private ActivityResponse buildActivity(
            String type,
            String title,
            String description,
            LocalDateTime createdAt) {

        return ActivityResponse.builder()
                .type(type)
                .title(title)
                .description(description)
                .createdAt(createdAt)
                .build();
    }
    
    
    private Address buildAddress(AddressRequest request)
    {
    	if(request == null) return null;
    	
    	return Address.builder()
    			.addressLine(request.getAddressLine())
    			.city(request.getCity())
    			.state(request.getState())
    			.pincode(request.getPincode())
    			.country(request.getCountry() != null ? request.getCountry() : "India")
    			.addressType(request.getAddressType())
    			.build();
    }
    
    private String generateStudentRollCode() {
    	int year = Year.now().getValue();
    	
    	long count = studentRepository.count() + 1;
    	
    	String code;
    	
    	do {
    		code = String.format("STU-%d-%03d", year, count++);
    	}while(studentRepository.existsByStudentRollCode(code));
    	
    	return code;
    }
    // MAPPER
    
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
    
    private StudentResponse mapToStudentResponse(Student s, User u) {
        return StudentResponse.builder()
                .id(s.getId())
                .userId(u.getId())
                .studentRollCode(s.getStudentRollCode())
                .firstName(s.getFirstName())
                .lastName(s.getLastName())
                .phone(s.getPhone())
                .email(u.getEmail())
                .gender(s.getGender())
                .className(s.getClassName())
                .section(s.getSection())
                .permanentAddress(mapToAddressResponse(s.getPermanentAddress()))
                .currentAddress(mapToAddressResponse(s.getCurrentAddress()))
                .fatherName(s.getFatherName())
                .fatherContact(s.getFatherContact())
                .motherName(s.getMotherName())
                .photoPath(s.getPhotoPath())
                .status(u.getStatus())
                .build();
    }
    
    private AttendanceResponse mapToAttendanceResponse(
            Attendance att, Student student, ClassRoom classRoom) {
        return AttendanceResponse.builder()
                .id(att.getId())
                .studentUserId(att.getUser().getId())
                .studentName(student.getFirstName()
                        + " " + student.getLastName())
                .studentRollCode(student.getStudentRollCode())
                .classRoomId(classRoom.getId())
                .className(classRoom.getClassName())
                .section(classRoom.getSection())
                .date(att.getDate())
                .status(att.getStatus())
                .build();
    }
    
    private MarksResponse mapToMarksResponse(Marks m, Student student) {
        double percentage = m.getTotalMarks() > 0
                ? (m.getMarksObtained() / m.getTotalMarks()) * 100 : 0.0;
        return MarksResponse.builder()
                .id(m.getId())
                .studentUserId(m.getStudent().getId())
                .studentName(student.getFirstName()
                        + " " + student.getLastName())
                .studentRollCode(student.getStudentRollCode())
                .subject(m.getSubject())
                .examType(m.getExamType())
                .marksObtained(m.getMarksObtained())
                .totalMarks(m.getTotalMarks())
                .percentage(Math.round(percentage * 100.0) / 100.0)
                .examDate(m.getExamDate())
                .build();
    }
    
    private TimetableResponse mapToTimetableResponse(
            Timetable tt,
            ClassRoom classRoom) {

        Teacher teacher =
                teacherRepository
                        .findByUser(tt.getTeacher())
                        .orElse(null);

        return TimetableResponse.builder()
                .id(tt.getId())
                .classRoomId(classRoom.getId())
                .className(classRoom.getClassName())
                .section(classRoom.getSection())
                .teacherId(
                        teacher != null ? teacher.getId() : null)
                .teacherName(
                        teacher != null
                                ? teacher.getFirstName() + " " + teacher.getLastName()
                                : "Unknown")
                .day(tt.getDay())
                .subject(tt.getSubject())
                .timeSlotStart(tt.getTimeSlotStart())
                .timeSlotEnd(tt.getTimeSlotEnd())
                .roomNumber(tt.getRoomNumber())
                .build();
    }
    
    private ClassRoomResponse mapToClassRoomResponse(ClassRoom classRoom) {
    	
    	Long totalStudents =
                studentRepository.countByClassNameAndSection(
                        classRoom.getClassName(),
                        classRoom.getSection());

        Long mentorId = null;
        String mentorName = null;
        String mentorCode = null;

        if (classRoom.getMentorTeacher() != null) {
            mentorId = classRoom.getMentorTeacher().getId();
            Teacher mp = teacherRepository
                    .findByUser(classRoom.getMentorTeacher()).orElse(null);
            if (mp != null) {
                mentorName = mp.getFirstName() + " " + mp.getLastName();
                mentorCode = mp.getTeacherCode();
            }
        }

        List<SubjectAllocationResponse> subjectTeachers =
                subjectAllocationRepository.findByClassRoom(classRoom)
                        .stream()
                        .map(a -> {
                            Teacher t = teacherRepository
                                    .findByUser(a.getTeacher()).orElse(null);
                            return SubjectAllocationResponse.builder()
                                    .id(a.getId())
                                    .teacherUserId(a.getTeacher().getId())
                                    .teacherName(t != null
                                        ? t.getFirstName() + " " + t.getLastName()
                                        : "Unknown")
                                    .teacherCode(t != null
                                        ? t.getTeacherCode() : "")
                                    .subject(a.getSubject())
                                    .build();
                        })
                        .collect(Collectors.toList());

        return ClassRoomResponse.builder()
                .id(classRoom.getId())
                .className(classRoom.getClassName())
                .section(classRoom.getSection())
                .totalStudents(totalStudents)
                .mentorTeacherId(mentorId)
                .mentorTeacherName(mentorName)
                .mentorTeacherCode(mentorCode)
                .subjectTeachers(subjectTeachers)
                .build();
    }
    

}
