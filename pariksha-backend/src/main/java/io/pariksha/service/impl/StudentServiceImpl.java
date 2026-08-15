package io.pariksha.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.pariksha.dto.response.AttendanceResponse;
import io.pariksha.dto.response.AttendanceSummaryResponse;
import io.pariksha.dto.response.MarksResponse;
import io.pariksha.dto.response.MarksSummaryResponse;
import io.pariksha.dto.response.PaperQuestionResponse;
import io.pariksha.dto.response.QuestionPaperResponse;
import io.pariksha.dto.response.TimetableResponse;
import io.pariksha.entity.Attendance;
import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.ExamSession;
import io.pariksha.entity.Marks;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.Student;
import io.pariksha.entity.StudentAnswer;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.Timetable;
import io.pariksha.entity.User;
import io.pariksha.enums.AnswerEvaluationStatus;
import io.pariksha.enums.ExamAvailabilityStatus;
import io.pariksha.enums.ExamSessionStatus;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.repository.AttendanceRepository;
import io.pariksha.repository.ClassRoomRepository;
import io.pariksha.repository.ExamSessionRepository;
import io.pariksha.repository.MarksRepository;
import io.pariksha.repository.PaperQuestionRepository;
import io.pariksha.repository.QuestionPaperRepository;
import io.pariksha.repository.StudentAnswerRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.TimetableRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.StudentService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class StudentServiceImpl implements StudentService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final MarksRepository marksRepository;
    private final TimetableRepository timeTableRepository;
    private final TeacherRepository teacherRepository;
    private final ClassRoomRepository classRoomRepository;
    private final QuestionPaperRepository paperRepository;
    private final PaperQuestionRepository paperQuestionRepository;
    private final ExamSessionRepository sessionRepository;      
    private final StudentAnswerRepository answerRepository;      



    @Override
    public List<AttendanceResponse> getMyAttendance(Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        ClassRoom classRoom = classRoomRepository
                .findByClassNameAndSection(
                        student.getClassName(), student.getSection())
                .orElse(null);

        return attendanceRepository.findByUser(studentUser)
                .stream()
                .map(att -> mapToAttendanceResponse(att, student, classRoom))
                .collect(Collectors.toList());
    }

    @Override
    public AttendanceSummaryResponse getMyAttendanceSummary(
            Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        List<Attendance> attendanceList =
                attendanceRepository.findByUser(studentUser);

        int totalDays  = attendanceList.size();
        int presentDays = 0;
        int absentDays  = 0;
        int lateDays    = 0;
        int halfDays    = 0;

        for (Attendance att : attendanceList) {
            switch (att.getStatus()) {
                case PRESENT  -> presentDays++;
                case ABSENT   -> absentDays++;
                case LATE     -> lateDays++;
                case HALF_DAY -> halfDays++;
            }
        }

        double effectivePresent = presentDays
                + (lateDays * 0.5)
                + (halfDays * 0.5);

        double percentage = totalDays > 0
                ? (effectivePresent / totalDays) * 100 : 0.0;

        percentage = Math.round(percentage * 100.0) / 100.0;

        String status;
        if (percentage >= 90)      status = "Excellent";
        else if (percentage >= 75) status = "Good";
        else if (percentage >= 60) status = "Average";
        else                       status = "Poor - Attendance shortage";

        return AttendanceSummaryResponse.builder()
                .studentUserId(studentUserId)
                .studentName(student.getFirstName()
                        + " " + student.getLastName())
                .studentRollCode(student.getStudentRollCode())
                .totalDays(totalDays)
                .presentDays(presentDays)
                .absentDays(absentDays)
                .lateDays(lateDays)
                .halfDays(halfDays)
                .attendancePercentage(percentage)
                .attendanceStatus(status)
                .build();
    }


    @Override
    public List<MarksResponse> getMyMarks(Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        return marksRepository.findByStudent(studentUser)
                .stream()
                .map(m -> mapToMarksResponse(m, student))
                .collect(Collectors.toList());
    }

    @Override
    public List<MarksSummaryResponse> getMyMarksSummary(Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        List<Marks> allMarks = marksRepository.findByStudent(studentUser);

        Map<String, List<Marks>> marksBySubject = allMarks.stream()
                .collect(Collectors.groupingBy(
                        Marks::getSubject,
                        LinkedHashMap::new,
                        Collectors.toList()));

        List<MarksSummaryResponse> summaryList = new ArrayList<>();

        for (Map.Entry<String, List<Marks>> entry
                : marksBySubject.entrySet()) {

            String subject = entry.getKey();
            List<Marks> subjectMarks = entry.getValue();

            double totalObtained = subjectMarks.stream()
                    .mapToDouble(Marks::getMarksObtained).sum();

            double totalMax = subjectMarks.stream()
                    .mapToDouble(Marks::getTotalMarks).sum();

            double percentage = totalMax > 0
                    ? (totalObtained / totalMax) * 100 : 0.0;

            percentage = Math.round(percentage * 100.0) / 100.0;

            String grade = calculateGrade(percentage);

            summaryList.add(MarksSummaryResponse.builder()
                    .subject(subject)
                    .totalMarksObtained(totalObtained)
                    .totalMaxMarks(totalMax)
                    .percentage(percentage)
                    .grade(grade)
                    .examsCount(subjectMarks.size())
                    .build());
        }

        return summaryList;
    }


    @Override
    public List<TimetableResponse> getMyTimetable(Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        ClassRoom classRoom = classRoomRepository
                .findByClassNameAndSection(
                        student.getClassName(), student.getSection())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom", "className+section",
                        student.getClassName() + "-" + student.getSection()));

        return timeTableRepository
                .findByClassRoomOrderByDayAscTimeSlotStartAsc(classRoom)
                .stream()
                .map(tt -> {
                    Teacher teacherProfile = teacherRepository
                            .findByUser(tt.getTeacher()).orElse(null);
                    return mapToTimetableResponse(tt, classRoom, teacherProfile);
                })
                .collect(Collectors.toList());
    }



    @Override
    public List<QuestionPaperResponse> getMyPapers(Long studentUserId) {

        User studentUser = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student student = studentRepository.findByUser(studentUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        ClassRoom classRoom = classRoomRepository
                .findByClassNameAndSection(
                        student.getClassName(), student.getSection())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ClassRoom", "className+section",
                        student.getClassName() + "-" + student.getSection()));

        return paperRepository.findByClassRoomAndActiveTrue(classRoom)
                .stream()
                // ← pass studentUserId correctly
                .map(paper -> mapToPaperResponseWithStatus(
                        paper, paper.getCreatedBy(), studentUserId))
                .collect(Collectors.toList());
    }


    @Transactional
    public void autoSubmitExpiredSession(ExamSession session) {

        // Only process IN_PROGRESS sessions
        if (session.getStatus() != ExamSessionStatus.IN_PROGRESS) return;

        // Get whatever answers were saved
        List<StudentAnswer> existingAnswers =
                answerRepository.findByExamSession(session);

        // Calculate marks for auto evaluated answers only
        double autoMarks = existingAnswers.stream()
                .mapToDouble(a -> a.getMarksAwarded() != null
                        ? a.getMarksAwarded() : 0.0)
                .sum();

        boolean allAutoEvaluated = existingAnswers.stream()
                .allMatch(a ->
                    a.getEvaluationStatus()
                        == AnswerEvaluationStatus.AUTO_EVALUATED);

        // Submit at expiry time
        session.setStatus(ExamSessionStatus.SUBMITTED);
        session.setSubmittedAt(session.getExpiresAt());

        // If all auto evaluated — mark as evaluated immediately
        if (allAutoEvaluated && !existingAnswers.isEmpty()) {
            session.setTotalMarksObtained(autoMarks);
            session.setStatus(ExamSessionStatus.EVALUATED);
        }

        sessionRepository.save(session);

        log.warn("Exam auto-submitted due to timeout: sessionId={} | student={}",
                session.getId(), session.getStudent().getId());
    }

    // ────────────────────────────────────────
    //   PRIVATE HELPERS
    // ────────────────────────────────────────

    private String calculateGrade(double percentage) {
        if (percentage >= 90)      return "A+";
        else if (percentage >= 80) return "A";
        else if (percentage >= 70) return "B";
        else if (percentage >= 60) return "C";
        else if (percentage >= 50) return "D";
        else                       return "F";
    }

    // ────────────────────────────────────────
    //   MAPPERS
    // ────────────────────────────────────────

    private AttendanceResponse mapToAttendanceResponse(
            Attendance att, Student student, ClassRoom classRoom) {
        return AttendanceResponse.builder()
                .id(att.getId())
                .studentUserId(att.getUser().getId())
                .studentName(student.getFirstName()
                        + " " + student.getLastName())
                .studentRollCode(student.getStudentRollCode())
                .classRoomId(classRoom != null ? classRoom.getId() : null)
                .className(classRoom != null
                        ? classRoom.getClassName() : null)
                .section(classRoom != null ? classRoom.getSection() : null)
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
                .build();
    }

    private TimetableResponse mapToTimetableResponse(
            Timetable tt, ClassRoom classRoom, Teacher teacher) {
        return TimetableResponse.builder()
                .id(tt.getId())
                .classRoomId(classRoom.getId())
                .className(classRoom.getClassName())
                .section(classRoom.getSection())
                .teacherId(teacher != null ? teacher.getId() : null)
                .teacherName(teacher != null
                        ? teacher.getFirstName() + " " + teacher.getLastName()
                        : "Unknown")
                .day(tt.getDay())
                .subject(tt.getSubject())
                .timeSlotStart(tt.getTimeSlotStart())
                .timeSlotEnd(tt.getTimeSlotEnd())
                .roomNumber(tt.getRoomNumber())
                .build();
    }

    private QuestionPaperResponse mapToPaperResponseWithStatus(
            QuestionPaper paper, User createdBy, Long studentUserId) {

        LocalDateTime now = LocalDateTime.now();

        ExamAvailabilityStatus availabilityStatus;
        Long timeRemainingSeconds = null;

        // Find existing session for this student + paper
        User studentUser = userRepository.findById(studentUserId)
                .orElse(null);

        ExamSession existingSession = null;

        if (studentUser != null) {
            existingSession = sessionRepository
                    .findByStudentAndQuestionPaper(studentUser, paper)
                    .orElse(null);
        }

        if (existingSession != null) {
            switch (existingSession.getStatus()) {
                case IN_PROGRESS -> {
                    if (now.isAfter(existingSession.getExpiresAt())) {
                        // Time ran out — auto submit
                        autoSubmitExpiredSession(existingSession);
                        availabilityStatus = ExamAvailabilityStatus.EXPIRED;
                    } else {
                        availabilityStatus = ExamAvailabilityStatus.IN_PROGRESS;
                        timeRemainingSeconds = java.time.Duration
                                .between(now, existingSession.getExpiresAt())
                                .getSeconds();
                    }
                }
                case SUBMITTED ->
                    availabilityStatus = ExamAvailabilityStatus.SUBMITTED;
                case EVALUATED ->
                    availabilityStatus = ExamAvailabilityStatus.EVALUATED;
                default ->
                    availabilityStatus = ExamAvailabilityStatus.AVAILABLE;
            }

        } else if (paper.getExamStartTime() != null
                && now.isBefore(paper.getExamStartTime())) {
            // Exam hasn't opened yet
            availabilityStatus = ExamAvailabilityStatus.UPCOMING;

        } else if (paper.getExamEndTime() != null
                && now.isAfter(paper.getExamEndTime())) {
            // Exam closed — student never started
            availabilityStatus = ExamAvailabilityStatus.MISSED;

        } else {
            // Open and available
            availabilityStatus = ExamAvailabilityStatus.AVAILABLE;
        }

        Teacher teacherProfile = teacherRepository
                .findByUser(createdBy).orElse(null);

        // Get questions — no answers for student
        List<PaperQuestionResponse> questionResponses =
                paperQuestionRepository
                        .findByQuestionPaperOrderByQuestionOrderAsc(paper)
                        .stream()
                        .map(pq -> PaperQuestionResponse.builder()
                                .id(pq.getId())
                                .questionId(pq.getQuestion().getId())
                                .questionOrder(pq.getQuestionOrder())
                                .subject(pq.getQuestion().getSubject())
                                .topic(pq.getQuestion().getTopic())
                                .questionType(pq.getQuestion().getQuestionType())
                                .difficultyLevel(
                                    pq.getQuestion().getDifficultyLevel())
                                .questionText(pq.getQuestion().getQuestionText())
                                .options(pq.getQuestion().getOptions())
                                .answer(null)        // ← hidden from student
                                .explanation(null)   // ← hidden from student
                                .marks(pq.getQuestion().getMarks())
                                .build())
                        .collect(Collectors.toList());

        return QuestionPaperResponse.builder()
                .id(paper.getId())
                .createdByUserId(createdBy.getId())
                .createdByName(teacherProfile != null
                        ? teacherProfile.getFirstName()
                          + " " + teacherProfile.getLastName()
                        : "Unknown")
                .createdByTeacherCode(teacherProfile != null
                        ? teacherProfile.getTeacherCode() : "")
                .title(paper.getTitle())
                .subject(paper.getSubject())
                .classLevel(paper.getClassLevel())
                .classRoomId(paper.getClassRoom() != null
                        ? paper.getClassRoom().getId() : null)
                .className(paper.getClassRoom() != null
                        ? paper.getClassRoom().getClassName() : null)
                .section(paper.getClassRoom() != null
                        ? paper.getClassRoom().getSection() : null)
                .durationMinutes(paper.getDurationMinutes())
                .totalMarks(paper.getTotalMarks())
                .instructions(paper.getInstructions())
                .examStartTime(paper.getExamStartTime())
                .examEndTime(paper.getExamEndTime())
                .availabilityStatus(availabilityStatus)
                .timeRemainingSeconds(timeRemainingSeconds)
                .aiGenerated(paper.isAiGenerated())
                .questions(questionResponses)
                .createdAt(paper.getCreatedAt())
                .build();
    }
}