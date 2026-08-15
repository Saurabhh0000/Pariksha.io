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

import io.pariksha.dto.request.CreateQuestionRequest;
import io.pariksha.dto.request.QuestionFilterRequest;
import io.pariksha.dto.request.UpdateQuestionRequest;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.QuestionResponse;
import io.pariksha.service.QuestionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/questions")
@RequiredArgsConstructor
public class QuestionController {

    private final QuestionService questionService;


    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<QuestionResponse>> createQuestion(
            @Valid @RequestBody CreateQuestionRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        QuestionResponse response =
                questionService.createQuestion(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Question created successfully.", response));
    }

    @PutMapping("/{questionId}")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<QuestionResponse>> updateQuestion(
            @PathVariable Long questionId,
            @Valid @RequestBody UpdateQuestionRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        QuestionResponse response =
                questionService.updateQuestion(
                        teacherUserId, questionId, request);

        return ResponseEntity.ok(ApiResponse.success(
                "Question updated successfully.", response));
    }


    @DeleteMapping("/{questionId}")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deleteQuestion(
            @PathVariable Long questionId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        questionService.deleteQuestion(teacherUserId, questionId);

        return ResponseEntity.ok(ApiResponse.success(
                "Question deleted successfully."));
    }


    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> getMyQuestions(
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<QuestionResponse> list =
                questionService.getMyQuestions(teacherUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Questions fetched successfully.", list));
    }


    @GetMapping("/filter")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> filterQuestions(
            @RequestParam(required = false) String subject,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String questionType,
            @RequestParam(required = false) String difficultyLevel,
            @RequestParam(required = false) String classLevel) {

        QuestionFilterRequest filter = new QuestionFilterRequest();
        filter.setSubject(subject);
        filter.setTopic(topic);
        filter.setClassLevel(classLevel);

        if (questionType != null) {
            filter.setQuestionType(
                io.pariksha.enums.QuestionType.valueOf(questionType));
        }
        if (difficultyLevel != null) {
            filter.setDifficultyLevel(
                io.pariksha.enums.DifficultyLevel.valueOf(difficultyLevel));
        }

        List<QuestionResponse> list =
                questionService.filterQuestions(filter);

        return ResponseEntity.ok(ApiResponse.success(
                "Questions filtered successfully.", list));
    }

    @GetMapping("/subjects")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> getAllSubjects() {

        List<String> subjects = questionService.getAllSubjects();

        return ResponseEntity.ok(ApiResponse.success(
                "Subjects fetched successfully.", subjects));
    }


    @GetMapping("/topics")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<String>>> getTopicsBySubject(
            @RequestParam String subject) {

        List<String> topics =
                questionService.getTopicBySubject(subject);

        return ResponseEntity.ok(ApiResponse.success(
                "Topics fetched successfully.", topics));
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionResponse>>> getAllQuestions() {

        List<QuestionResponse> list =
                questionService.getAllQuestions();

        return ResponseEntity.ok(ApiResponse.success(
                "All questions fetched successfully.", list));
    }

    @GetMapping("/{questionId}")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<QuestionResponse>> getQuestionById(
            @PathVariable Long questionId) {

        QuestionResponse response =
                questionService.getQuestionById(questionId);

        return ResponseEntity.ok(ApiResponse.success(
                "Question fetched successfully.", response));
    }
}