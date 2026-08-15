package io.pariksha.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AiPaperRequest;
import io.pariksha.dto.response.AiEvaluationResponse;
import io.pariksha.entity.Question;
import io.pariksha.entity.User;

@Service
public interface GeminiService {
	
	List<Question> generateQuestions(AiPaperRequest request, User teacher);
	
	AiEvaluationResponse evaluateAnswer(String questionText, String correctAnswer, String studentAnswer, Integer maxMarks);

}
