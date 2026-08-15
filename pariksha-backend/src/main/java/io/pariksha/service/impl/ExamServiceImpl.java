package io.pariksha.service.impl;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.pariksha.dto.request.EvaluateAnswerRequest;
import io.pariksha.dto.request.SubmitAnswerRequest;
import io.pariksha.dto.request.SubmitExamRequest;
import io.pariksha.dto.response.AiEvaluationResponse;
import io.pariksha.dto.response.ExamSessionResponse;
import io.pariksha.dto.response.StudentAnswerResponse;
import io.pariksha.entity.ExamSession;
import io.pariksha.entity.Question;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.Student;
import io.pariksha.entity.StudentAnswer;
import io.pariksha.entity.User;
import io.pariksha.enums.AnswerEvaluationStatus;
import io.pariksha.enums.ExamSessionStatus;
import io.pariksha.enums.QuestionType;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.DuplicateResourceException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.exceptions.UnauthorizedException;
import io.pariksha.repository.ExamSessionRepository;
import io.pariksha.repository.PaperQuestionRepository;
import io.pariksha.repository.QuestionPaperRepository;
import io.pariksha.repository.QuestionRepository;
import io.pariksha.repository.StudentAnswerRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.ExamService;
import io.pariksha.service.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamServiceImpl implements ExamService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final QuestionPaperRepository paperRepository;
    private final PaperQuestionRepository paperQuestionRepository;
    private final ExamSessionRepository sessionRepository;
    private final StudentAnswerRepository answerRepository;
    private final QuestionRepository questionRepository;
    
    private final GeminiService geminiService;


    // ────────────────────────────────────────
    //   START EXAM
    // ────────────────────────────────────────

    @Override
    @Transactional
    public ExamSessionResponse startExam(Long studentUserId, Long paperId) {

        User student = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        LocalDateTime now = LocalDateTime.now();

        // Check exam has started
        if (paper.getExamStartTime() != null &&
                now.isBefore(paper.getExamStartTime())) {
            throw new BadRequestException(
                    "Exam has not started yet. " +
                    "It will be available from " + paper.getExamStartTime());
        }

        // Check exam has not closed
        if (paper.getExamEndTime() != null &&
                now.isAfter(paper.getExamEndTime())) {
            throw new BadRequestException(
                    "This exam has ended. The deadline was " +
                    paper.getExamEndTime() + ". You missed this exam.");
        }

        // Check if student already attempted
     // If a session already exists, either resume it (still in progress and
     // not expired) or block re-starting a finished/expired one.
     Optional<ExamSession> existingOpt =
             sessionRepository.findByStudentAndQuestionPaper(student, paper);

     if (existingOpt.isPresent()) {
         ExamSession existing = existingOpt.get();

         if (existing.getStatus() == ExamSessionStatus.IN_PROGRESS) {

             if (now.isAfter(existing.getExpiresAt())) {
                 autoSubmitExpiredSession(existing);
                 throw new BadRequestException(
                         "Your exam time has expired and " +
                         "was automatically submitted.");
             }

             // Resume — return the existing session (with previously saved
             // answers, if any) instead of erroring out.
             log.info("Resuming exam session: student={} | paper={}",
                     studentUserId, paperId);

             Student resumeProfile = studentRepository.findByUser(student)
                     .orElseThrow(() -> new ResourceNotFoundException(
                             "StudentProfile", "userId", studentUserId));

             return mapToSessionResponse(existing, resumeProfile, paper, true);
         }

         // SUBMITTED or EVALUATED — genuinely already completed
         throw new DuplicateResourceException(
                 "You have already started or submitted this exam.");
     }

        // Calculate expiry time for this student
        LocalDateTime expiresAt = now.plusMinutes(paper.getDurationMinutes());

        // If exam ends before student's duration — cap at exam end time
        if (paper.getExamEndTime() != null &&
                expiresAt.isAfter(paper.getExamEndTime())) {
            expiresAt = paper.getExamEndTime();
        }

        // Verify paper belongs to student's class
        Student studentProfile = studentRepository.findByUser(student)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        if (paper.getClassRoom() != null) {
            boolean sameClass =
                    paper.getClassRoom().getClassName()
                            .equals(studentProfile.getClassName()) &&
                    paper.getClassRoom().getSection()
                            .equals(studentProfile.getSection());

            if (!sameClass) {
                throw new UnauthorizedException(
                        "This paper is not assigned to your class.");
            }
        }

        // Create exam session
        ExamSession session = ExamSession.builder()
                .student(student)
                .questionPaper(paper)
                .status(ExamSessionStatus.IN_PROGRESS)
                .startedAt(now)
                .expiresAt(expiresAt)
                .totalMarks(paper.getTotalMarks())
                .build();

        sessionRepository.save(session);

        log.info("Exam started: student={} | paper={} | expiresAt={}",
                studentUserId, paperId, expiresAt);

        return mapToSessionResponse(session, studentProfile, paper, false);
    }

    // ────────────────────────────────────────
    //   SUBMIT EXAM
    // ────────────────────────────────────────

    @Override
    @Transactional
    public ExamSessionResponse submitExam(Long studentUserId,
            Long paperId, SubmitExamRequest request) {

        User student = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        // Get existing session
        ExamSession session = sessionRepository
                .findByStudentAndQuestionPaper(student, paper)
                .orElseThrow(() -> new BadRequestException(
                        "You have not started this exam yet. " +
                        "Please start the exam first."));

        // Cannot resubmit
        if (session.getStatus() == ExamSessionStatus.SUBMITTED ||
                session.getStatus() == ExamSessionStatus.EVALUATED) {
            throw new BadRequestException(
                    "You have already submitted this exam.");
        }

        LocalDateTime now = LocalDateTime.now();

        // Warn if submitting after expiry — still accept
        if (now.isAfter(session.getExpiresAt())) {
            log.warn("Student {} submitted after time expiry for paper {}",
                    studentUserId, paperId);
        }

        // Process each answer
        List<StudentAnswer> savedAnswers = new ArrayList<>();
        double autoMarks = 0.0;

        for (SubmitAnswerRequest answerReq : request.getAnswers()) {

            Question question = questionRepository
                    .findById(answerReq.getQuestionId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Question", "id", answerReq.getQuestionId()));

            String studentAnswer = answerReq.getAnswerText();
            String correctAnswer = question.getAnswer();

            // Auto evaluate MCQ, TRUE_FALSE, FILL_IN_THE_BLANK
            boolean isAutoEvaluated =
                    question.getQuestionType() == QuestionType.MCQ ||
                    question.getQuestionType() == QuestionType.TRUE_FALSE ||
                    question.getQuestionType() == QuestionType.FILL_IN_THE_BLANK;

            Boolean isCorrect = null;
            Double marksAwarded = null;
            AnswerEvaluationStatus evalStatus;

            if (isAutoEvaluated) {

                isCorrect = studentAnswer != null &&
                        studentAnswer.trim()
                                .equalsIgnoreCase(correctAnswer.trim());

                marksAwarded = isCorrect
                        ? question.getMarks().doubleValue() : 0.0;

                autoMarks += marksAwarded;
                evalStatus = AnswerEvaluationStatus.AUTO_EVALUATED;

            } else {
                // SHORT_ANSWER, LONG_ANSWER — teacher evaluates
                evalStatus = AnswerEvaluationStatus.PENDING_REVIEW;
            }

            StudentAnswer answer = StudentAnswer.builder()
                    .examSession(session)
                    .question(question)
                    .answerText(studentAnswer)
                    .isCorrect(isCorrect)        // ← field name in entity
                    .marksAwarded(marksAwarded)
                    .evaluationStatus(evalStatus)
                    .build();

            savedAnswers.add(answer);
        }

        // Save all answers
        answerRepository.saveAll(savedAnswers);

        // Check if all answers are auto evaluated
        boolean allAutoEvaluated = savedAnswers.stream()
                .allMatch(a -> a.getEvaluationStatus()
                        == AnswerEvaluationStatus.AUTO_EVALUATED);

        // Update session status
        session.setStatus(ExamSessionStatus.SUBMITTED);
        session.setSubmittedAt(LocalDateTime.now());

        // ← REMOVED session.setAnswers() — already saved via saveAll
        // setting it again causes Hibernate to try duplicate inserts

        if (allAutoEvaluated) {
            session.setTotalMarksObtained(autoMarks);
            session.setStatus(ExamSessionStatus.EVALUATED);
        }

        sessionRepository.save(session);

        log.info("Exam submitted: student={} | paper={} | autoMarks={}",
                studentUserId, paperId, autoMarks);

        Student studentProfile = studentRepository.findByUser(student)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        return mapToSessionResponse(session, studentProfile, paper, true);
    }

    @Override
    @Transactional
    public int autoSubmitMissedExams() {

        LocalDateTime now = LocalDateTime.now();

        // Only papers with a real deadline that has already closed
        List<QuestionPaper> closedPapers =
                paperRepository.findByExamEndTimeBefore(now);

        int count = 0;

        for (QuestionPaper paper : closedPapers) {

            if (paper.getClassRoom() == null) continue; // not assigned to a class — skip

            List<Student> classStudents = studentRepository
                    .findByClassNameAndSection(
                            paper.getClassRoom().getClassName(),
                            paper.getClassRoom().getSection());

            for (Student studentProfile : classStudents) {

                User studentUser = studentProfile.getUser();

                boolean alreadyHasSession = sessionRepository
                        .findByStudentAndQuestionPaper(studentUser, paper)
                        .isPresent();

                if (alreadyHasSession) continue; // started or submitted — leave untouched

                ExamSession missedSession = ExamSession.builder()
                        .student(studentUser)
                        .questionPaper(paper)
                        .status(ExamSessionStatus.EVALUATED)
                        .startedAt(paper.getExamEndTime())
                        .expiresAt(paper.getExamEndTime())
                        .submittedAt(paper.getExamEndTime())
                        .totalMarks(paper.getTotalMarks())
                        .totalMarksObtained(0.0)
                        .build();

                sessionRepository.save(missedSession);
                count++;

                log.warn("Auto zero-submitted missed exam: student={} | paper={}",
                        studentUser.getId(), paper.getId());
            }
        }

        return count;
    }
    
    // ────────────────────────────────────────
    //   VIEW RESULT
    // ────────────────────────────────────────

    @Override
    public ExamSessionResponse getMyResult(
            Long studentUserId, Long paperId) {

        User student = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        ExamSession session = sessionRepository
                .findByStudentAndQuestionPaper(student, paper)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ExamSession", "student+paper",
                        studentUserId + "+" + paperId));

        if (session.getStatus() == ExamSessionStatus.IN_PROGRESS) {
            throw new BadRequestException(
                    "Please submit your exam first to view results.");
        }

        Student studentProfile = studentRepository.findByUser(student)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        return mapToSessionResponse(session, studentProfile, paper, true);
    }

    @Override
    public List<ExamSessionResponse> getMyExamHistory(Long studentUserId) {

        User student = userRepository.findById(studentUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Student", "id", studentUserId));

        Student studentProfile = studentRepository.findByUser(student)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId", studentUserId));

        return sessionRepository.findByStudent(student)
                .stream()
                .map(session -> mapToSessionResponse(
                        session, studentProfile,
                        session.getQuestionPaper(), true))
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────
    //   TEACHER — VIEW RESULTS
    // ────────────────────────────────────────

    @Override
    public List<ExamSessionResponse> getPaperResults(
            Long teacherUserId, Long paperId) {

        userRepository.findById(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher", "id", teacherUserId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        if (!paper.getCreatedBy().getId().equals(teacherUserId)) {
            throw new UnauthorizedException(
                    "You can only view results for your own papers.");
        }

        return sessionRepository.findByQuestionPaper(paper)
                .stream()
                .map(session -> {
                    Student sp = studentRepository
                            .findByUser(session.getStudent()).orElse(null);
                    if (sp == null) return null;
                    return mapToSessionResponse(session, sp, paper, true);
                })
                .filter(r -> r != null)
                .collect(Collectors.toList());
    }

    // ────────────────────────────────────────
    //   TEACHER — EVALUATE ANSWER
    // ────────────────────────────────────────

    @Override
    @Transactional
    public ExamSessionResponse evaluateAnswer(Long teacherUserId,
            Long sessionId, EvaluateAnswerRequest request) {

        userRepository.findById(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher", "id", teacherUserId));

        ExamSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "ExamSession", "id", sessionId));

        if (!session.getQuestionPaper()
                .getCreatedBy().getId().equals(teacherUserId)) {
            throw new UnauthorizedException(
                    "You can only evaluate answers for your own papers.");
        }

        StudentAnswer answer = answerRepository
                .findById(request.getAnswerId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentAnswer", "id", request.getAnswerId()));

        // Validate marks not exceeding question marks
        if (request.getMarksAwarded() >
                answer.getQuestion().getMarks()) {
            throw new BadRequestException(
                    "Marks awarded cannot exceed question marks of " +
                    answer.getQuestion().getMarks());
        }

        // Update answer evaluation
        answer.setMarksAwarded(request.getMarksAwarded());
        answer.setIsCorrect(request.getMarksAwarded() > 0);
        answer.setTeacherFeedback(request.getTeacherFeedback());
        answer.setEvaluationStatus(AnswerEvaluationStatus.REVIEWED);
        answerRepository.save(answer);

        // Check if all answers evaluated
        List<StudentAnswer> allAnswers =
                answerRepository.findByExamSession(session);

        boolean allEvaluated = allAnswers.stream()
                .allMatch(a ->
                        a.getEvaluationStatus()
                                == AnswerEvaluationStatus.AUTO_EVALUATED ||
                        a.getEvaluationStatus()
                                == AnswerEvaluationStatus.REVIEWED);

        if (allEvaluated) {
            double totalObtained = allAnswers.stream()
                    .mapToDouble(a -> a.getMarksAwarded() != null
                            ? a.getMarksAwarded() : 0.0)
                    .sum();

            session.setTotalMarksObtained(totalObtained);
            session.setStatus(ExamSessionStatus.EVALUATED);
            sessionRepository.save(session);

            log.info("Exam fully evaluated: sessionId={} | marks={}/{}",
                    sessionId, totalObtained, session.getTotalMarks());
        }

        Student studentProfile = studentRepository
                .findByUser(session.getStudent())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentProfile", "userId",
                        session.getStudent().getId()));

        return mapToSessionResponse(session, studentProfile,
                session.getQuestionPaper(), true);
    }

    // ────────────────────────────────────────
    //   AUTO SUBMIT EXPIRED SESSION
    // ────────────────────────────────────────

    @Transactional
    public void autoSubmitExpiredSession(ExamSession session) {

        if (session.getStatus() != ExamSessionStatus.IN_PROGRESS) return;

        List<StudentAnswer> existingAnswers =
                answerRepository.findByExamSession(session);

        double autoMarks = existingAnswers.stream()
                .mapToDouble(a -> a.getMarksAwarded() != null
                        ? a.getMarksAwarded() : 0.0)
                .sum();

        boolean allAutoEvaluated = existingAnswers.isEmpty() ||
                existingAnswers.stream()
                        .allMatch(a -> a.getEvaluationStatus()
                                == AnswerEvaluationStatus.AUTO_EVALUATED);

        // Submit at expiry time
        session.setStatus(ExamSessionStatus.SUBMITTED);
        session.setSubmittedAt(session.getExpiresAt());

        if (allAutoEvaluated && !existingAnswers.isEmpty()) {
            session.setTotalMarksObtained(autoMarks);
            session.setStatus(ExamSessionStatus.EVALUATED);
        } else if (existingAnswers.isEmpty()) {
            // Student never answered anything
            session.setTotalMarksObtained(0.0);
            session.setStatus(ExamSessionStatus.EVALUATED);
        }

        sessionRepository.save(session);

        log.warn("Exam auto-submitted: sessionId={} | student={}",
                session.getId(), session.getStudent().getId());
    }
    
    
    
    
    @Override
    public AiEvaluationResponse getAiEvaluation(
            Long teacherUserId, Long answerId) {

        userRepository.findById(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher", "id", teacherUserId));

        StudentAnswer answer = answerRepository.findById(answerId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "StudentAnswer", "id", answerId));

        // Only for SHORT/LONG answers
        QuestionType qType = answer.getQuestion().getQuestionType();
        if (qType == QuestionType.MCQ ||
                qType == QuestionType.TRUE_FALSE ||
                qType == QuestionType.FILL_IN_THE_BLANK) {
            throw new BadRequestException(
                    "AI evaluation is only for SHORT and LONG answers. " +
                    "MCQ and TRUE/FALSE are auto evaluated.");
        }

        // Verify teacher owns this paper
        ExamSession session = answer.getExamSession();
        if (!session.getQuestionPaper()
                .getCreatedBy().getId().equals(teacherUserId)) {
            throw new UnauthorizedException(
                    "You can only evaluate answers for your own papers.");
        }

        log.info("Getting AI evaluation for answerId={} by teacher={}",
                answerId, teacherUserId);

        // Call Gemini to evaluate
        return geminiService.evaluateAnswer(
                answer.getQuestion().getQuestionText(),
                answer.getQuestion().getAnswer(),
                answer.getAnswerText(),
                answer.getQuestion().getMarks()
        );
    }
    
    
    
    
    
    
    

    // ────────────────────────────────────────
    //   MAPPER
    // ────────────────────────────────────────

    private ExamSessionResponse mapToSessionResponse(
            ExamSession session, Student studentProfile,
            QuestionPaper paper, boolean showAnswers) {

        LocalDateTime now = LocalDateTime.now();

        // Calculate time remaining in seconds
        Long timeRemainingSeconds = null;
        if (session.getStatus() == ExamSessionStatus.IN_PROGRESS
                && session.getExpiresAt() != null) {
            timeRemainingSeconds = Duration
                    .between(now, session.getExpiresAt()).getSeconds();
            // Clamp to 0 — never negative
            if (timeRemainingSeconds < 0) timeRemainingSeconds = 0L;
        }

        // Calculate percentage and grade
        Double percentage = null;
        String grade = null;

        if (session.getTotalMarksObtained() != null
                && session.getTotalMarks() != null
                && session.getTotalMarks() > 0) {

            percentage = (session.getTotalMarksObtained()
                    / session.getTotalMarks()) * 100;
            percentage = Math.round(percentage * 100.0) / 100.0;
            grade = calculateGrade(percentage);
        }

        // Map answers
        List<StudentAnswerResponse> answerResponses = new ArrayList<>();

        if (showAnswers) {
            List<StudentAnswer> answers =
                    answerRepository.findByExamSession(session);

            answerResponses = answers.stream()
                    .map(ans -> StudentAnswerResponse.builder()
                            .id(ans.getId())
                            .questionId(ans.getQuestion().getId())
                            .questionText(ans.getQuestion().getQuestionText())
                            .questionType(ans.getQuestion().getQuestionType())
                            .options(ans.getQuestion().getOptions())
                            .answerText(ans.getAnswerText())
                            // Show correct answer only after submission
                            .correctAnswer(
                                    session.getStatus()
                                        != ExamSessionStatus.IN_PROGRESS
                                            ? ans.getQuestion().getAnswer()
                                            : null)
                            .isCorrect(ans.getIsCorrect())
                            .marksAwarded(ans.getMarksAwarded())
                            .totalMarksForQuestion(
                                    ans.getQuestion().getMarks())
                            .evaluationStatus(ans.getEvaluationStatus())
                            .teacherFeedback(ans.getTeacherFeedback())
                            .build())
                    .collect(Collectors.toList());
        }

        return ExamSessionResponse.builder()
                .id(session.getId())
                .studentUserId(session.getStudent().getId())
                .studentName(studentProfile.getFirstName()
                        + " " + studentProfile.getLastName())
                .studentRollCode(studentProfile.getStudentRollCode())
                .paperId(paper.getId())
                .paperTitle(paper.getTitle())
                .subject(paper.getSubject())
                .totalMarks(session.getTotalMarks())
                .status(session.getStatus())
                .startedAt(session.getStartedAt())
                .expiresAt(session.getExpiresAt())
                .timeRemainingSeconds(timeRemainingSeconds)
                .submittedAt(session.getSubmittedAt())
                .totalMarksObtained(session.getTotalMarksObtained())
                .percentage(percentage)
                .grade(grade)
                .answers(answerResponses)
                .build();
    }

    private String calculateGrade(double percentage) {
        if (percentage >= 90)      return "A+";
        else if (percentage >= 80) return "A";
        else if (percentage >= 70) return "B";
        else if (percentage >= 60) return "C";
        else if (percentage >= 50) return "D";
        else                       return "F";
    }
}