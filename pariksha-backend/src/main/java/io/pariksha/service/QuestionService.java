package io.pariksha.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.CreateQuestionRequest;
import io.pariksha.dto.request.QuestionFilterRequest;
import io.pariksha.dto.request.UpdateQuestionRequest;
import io.pariksha.dto.response.QuestionResponse;

@Service
public interface QuestionService {
	
	QuestionResponse createQuestion(Long teacherUserId, CreateQuestionRequest request);
	
	QuestionResponse updateQuestion(Long teacherUserId, Long questionId, UpdateQuestionRequest request);
	
	void deleteQuestion(Long teacherUserId, Long questionId);
	
	QuestionResponse getQuestionById(Long questionId);
	
	List<QuestionResponse> getMyQuestions(Long teacherUserId);
	
	List<QuestionResponse> getAllQuestions();
	
	List<QuestionResponse> filterQuestions(QuestionFilterRequest request);
	
	List<String> getAllSubjects();
	 
	List<String> getTopicBySubject(String subject);
	
	

}
