package io.pariksha.controller;

import io.pariksha.dto.request.AiPaperRequest;
import io.pariksha.dto.request.CreatePaperRequest;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.QuestionPaperResponse;
import io.pariksha.service.PaperService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/papers")
@RequiredArgsConstructor
public class PaperController {

    private final PaperService paperService;


    @PostMapping
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<QuestionPaperResponse>> createPaper(
            @Valid @RequestBody CreatePaperRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        QuestionPaperResponse response =
                paperService.createPaper(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "Question paper created successfully.", response));
    }

    @PostMapping("/ai")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<QuestionPaperResponse>> generateAiPaper(
            @Valid @RequestBody AiPaperRequest request,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        QuestionPaperResponse response =
                paperService.generateAiPaper(teacherUserId, request);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(
                        "AI question paper generated successfully.", response));
    }


    @GetMapping("/my")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<List<QuestionPaperResponse>>> getMyPapers(
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        List<QuestionPaperResponse> list =
                paperService.getMyPapers(teacherUserId);

        return ResponseEntity.ok(ApiResponse.success(
                "Papers fetched successfully.", list));
    }


    @GetMapping("/{paperId}")
    @PreAuthorize("hasAnyAuthority('ROLE_TEACHER','ROLE_STUDENT','ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<QuestionPaperResponse>> getPaperById(
            @PathVariable Long paperId) {

        QuestionPaperResponse response =
                paperService.getPaperById(paperId);

        return ResponseEntity.ok(ApiResponse.success(
                "Paper fetched successfully.", response));
    }


    @DeleteMapping("/{paperId}")
    @PreAuthorize("hasAuthority('ROLE_TEACHER')")
    public ResponseEntity<ApiResponse<Void>> deletePaper(
            @PathVariable Long paperId,
            HttpServletRequest httpRequest) {

        Long teacherUserId = (Long) httpRequest.getAttribute("userId");

        paperService.deletePaper(teacherUserId, paperId);

        return ResponseEntity.ok(ApiResponse.success(
                "Paper deleted successfully."));
    }


    @GetMapping("/all")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<QuestionPaperResponse>>> getAllPapers() {

        List<QuestionPaperResponse> list =
                paperService.getAllPapers();

        return ResponseEntity.ok(ApiResponse.success(
                "All papers fetched successfully.", list));
    }
}