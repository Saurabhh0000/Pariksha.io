package io.pariksha.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import io.pariksha.dto.request.EvaluateAnswerRequest;
import io.pariksha.dto.request.SubmitExamRequest;
import io.pariksha.dto.response.AiEvaluationResponse;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.ExamSessionResponse;
import io.pariksha.service.ExamService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequiredArgsConstructor
public class ExamController {

    private final ExamService examService;


    @PostMapping("/api/student/exam/{paperId}/start")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> startExam(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long studentUserId = (Long) httpRequest.getAttribute("userId");

        ExamSessionResponse response =
                examService.startExam(studentUserId, paperId);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Exam started. Good luck!", response));
    }

    @PostMapping("/api/student/exam/{paperId}/submit")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> submitExam(
            @PathVariable Long paperId,
            @Valid @RequestBody SubmitExamRequest request,
            HttpServletRequest httpRequest) {

        Long studentUserId = (Long) httpRequest.getAttribute("userId");

        ExamSessionResponse response =
                examService.submitExam(studentUserId, paperId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Exam submitted successfully.", response));
    }

    @GetMapping("/api/student/exam/{paperId}/result")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> getMyResult(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long studentUserId = (Long) httpRequest.getAttribute("userId");

        ExamSessionResponse response =
                examService.getMyResult(studentUserId, paperId);

        return ResponseEntity.ok(ApiResponse.success(
                "Result fetched successfully.", response));
    }

    @GetMapping("/api/student/exam/history")
    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getMyExamHistory(
            HttpServletRequest httpRequest) {

        Long studentUserId = (Long) httpRequest.getAttribute("userId");

        List<ExamSessionResponse> list =
                examService.getMyExamHistory(studentUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Exam history fetched successfully.", list));
    }
    
    
    @GetMapping("/api/teacher/exam/{paperId}/results")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<List<ExamSessionResponse>>> getPaperResults(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<ExamSessionResponse> list =
                examService.getPaperResults(teacherUserId, paperId);

        return ResponseEntity.ok(ApiResponse.success(
                "Results fetched successfully.", list));
    }

    @PostMapping("/api/teacher/exam/session/{sessionId}/evaluate")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<ExamSessionResponse>> evaluateAnswer(
            @PathVariable Long sessionId,
            @Valid @RequestBody EvaluateAnswerRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        ExamSessionResponse response =
                examService.evaluateAnswer(
                        teacherUserId, sessionId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Answer evaluated successfully.", response));
    }
    
    @GetMapping("/api/teacher/exam/answer/{answerId}/ai-evaluate")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<AiEvaluationResponse>> getAiEvaluation(
            @PathVariable Long answerId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        AiEvaluationResponse response =
                examService.getAiEvaluation(teacherUserId, answerId);

        return ResponseEntity.ok(ApiResponse.success(
                "AI evaluation suggestion ready. " +
                "Please review and confirm the marks.",
                response));
    }
}