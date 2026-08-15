package io.pariksha.service;

import io.pariksha.dto.request.EvaluateAnswerRequest;
import io.pariksha.dto.request.SubmitExamRequest;
import io.pariksha.dto.response.AiEvaluationResponse;
import io.pariksha.dto.response.ExamSessionResponse;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public interface ExamService {

    // Student starts exam — creates session
    ExamSessionResponse startExam(Long studentUserId, Long paperId);

    // Student submits all answers
    ExamSessionResponse submitExam(Long studentUserId,
            Long paperId, SubmitExamRequest request);
    
    int autoSubmitMissedExams();

    // Student views own result
    ExamSessionResponse getMyResult(Long studentUserId, Long paperId);

    // Student views all attempted exams
    List<ExamSessionResponse> getMyExamHistory(Long studentUserId);

    // Teacher views all results for a paper
    List<ExamSessionResponse> getPaperResults(
            Long teacherUserId, Long paperId);

    // Teacher evaluates SHORT/LONG answer
    ExamSessionResponse evaluateAnswer(Long teacherUserId,Long sessionId, EvaluateAnswerRequest request);
    
    AiEvaluationResponse getAiEvaluation(Long teacherUserId, Long answerId);
}