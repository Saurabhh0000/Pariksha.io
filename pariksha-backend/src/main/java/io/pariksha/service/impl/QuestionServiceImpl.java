package io.pariksha.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.CreateQuestionRequest;
import io.pariksha.dto.request.QuestionFilterRequest;
import io.pariksha.dto.request.UpdateQuestionRequest;
import io.pariksha.dto.response.QuestionResponse;
import io.pariksha.entity.Question;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.exceptions.UnauthorizedException;
import io.pariksha.repository.QuestionRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.QuestionService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class QuestionServiceImpl implements QuestionService {
	
	private final QuestionRepository questionRepository;
	private final UserRepository userRepository;
	private final TeacherRepository teacherRepository;
	
	
	@Override
	@Transactional
	public QuestionResponse createQuestion(Long teacherUserId, CreateQuestionRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		if(request.getQuestionType().name().equals("MCQ") && (request.getOptions() == null || request.getOptions().isBlank())) {
			throw new BadRequestException("MCQ questions must have options.");
		}
		
		Question question = Question.builder()
		.createdBy(teacherUser)
		.subject(request.getSubject())
		.topic(request.getTopic())
		.questionType(request.getQuestionType())
		.difficultyLevel(request.getDifficultyLevel())
		.questionText(request.getQuestionText())
		.options(request.getOptions())
		.answer(request.getAnswer())
		.explanation(request.getExplanation())
		.marks(request.getMarks())
		.classLevel(request.getClassLevel())
		.active(true)
		.build();
		
		questionRepository.save(question);
		
		log.info("Question created by teacher={} | subject={} | topic={}",
                teacherUserId, request.getSubject(), request.getTopic());
		
		return mapToQuestionResponse(question, teacherUser);
	}

	@Override
	@Transactional
	public QuestionResponse updateQuestion(Long teacherUserId, Long questionId, UpdateQuestionRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		Question question = questionRepository.findById(questionId).orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
		
		if(!question.getCreatedBy().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("You can only update your own questions.");
		}
		
		if(request.getSubject() != null)
			question.setSubject(request.getSubject());
        if (request.getTopic() != null)
            question.setTopic(request.getTopic());
        if (request.getQuestionType() != null)
            question.setQuestionType(request.getQuestionType());
        if (request.getDifficultyLevel() != null)
            question.setDifficultyLevel(request.getDifficultyLevel());
        if (request.getQuestionText() != null)
            question.setQuestionText(request.getQuestionText());
        if (request.getOptions() != null)
            question.setOptions(request.getOptions());
        if (request.getAnswer() != null)
            question.setAnswer(request.getAnswer());
        if (request.getExplanation() != null)
            question.setExplanation(request.getExplanation());
        if (request.getMarks() != null)
            question.setMarks(request.getMarks());
        if (request.getClassLevel() != null)
            question.setClassLevel(request.getClassLevel());
        
        questionRepository.save(question);
        
        log.info("Question updated: id={} by teacher={}",
                questionId, teacherUserId);
        
		return mapToQuestionResponse(question, teacherUser);
	}

	@Override
	@Transactional
	public void deleteQuestion(Long teacherUserId, Long questionId) {
		
		Question question = questionRepository.findById(questionId).orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
		
		if(!question.getCreatedBy().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("You can only delete your own questions.");
		}
		
		question.setActive(false);
		questionRepository.save(question);
		
		log.info("Question soft deleted: id={} by teacher={}",
                questionId, teacherUserId);
		
	}

	@Override
	public QuestionResponse getQuestionById(Long questionId) {
		
		Question question = questionRepository.findById(questionId).orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
		
		
		return mapToQuestionResponse(question, question.getCreatedBy());
	}

	@Override
	public List<QuestionResponse> getMyQuestions(Long teacherUserId) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		
		return questionRepository.findByCreatedByAndActiveTrue(teacherUser)
				.stream()
				.map(q -> mapToQuestionResponse(q, teacherUser))
				.collect(Collectors.toList());
	}

	@Override
	public List<QuestionResponse> getAllQuestions() {
		
		return questionRepository.findByActiveTrue()
				.stream()
				.map(q -> mapToQuestionResponse(q, q.getCreatedBy()))
				.collect(Collectors.toList());
	}

	@Override
	public List<QuestionResponse> filterQuestions(QuestionFilterRequest request) {
		
		return questionRepository.filterQuestion(request.getSubject(), request.getTopic(), request.getQuestionType(), request.getDifficultyLevel(), request.getClassLevel())
				.stream()
				.map(q -> mapToQuestionResponse(q, q.getCreatedBy()))
				.collect(Collectors.toList());
	}

	@Override
	public List<String> getAllSubjects() {
		return questionRepository.findDistinctSubjects();
	}

	@Override
	public List<String> getTopicBySubject(String subject) {
		return questionRepository.findDistinctTopicsBySubject(subject);
	}
	
	// Mapper 
	
    private QuestionResponse mapToQuestionResponse(
            Question q, User createdBy) {

        // Get teacher profile for name + code
        Teacher teacherProfile = teacherRepository
                .findByUser(createdBy).orElse(null);

        return QuestionResponse.builder()
                .id(q.getId())
                .createdByUserId(createdBy.getId())
                .createdByName(teacherProfile != null
                        ? teacherProfile.getFirstName()
                          + " " + teacherProfile.getLastName()
                        : "Unknown")
                .createdByTeacherCode(teacherProfile != null
                        ? teacherProfile.getTeacherCode() : "")
                .subject(q.getSubject())
                .topic(q.getTopic())
                .questionType(q.getQuestionType())
                .difficultyLevel(q.getDifficultyLevel())
                .questionText(q.getQuestionText())
                .options(q.getOptions())
                .answer(q.getAnswer())
                .explanation(q.getExplanation())
                .marks(q.getMarks())
                .classLevel(q.getClassLevel())
                .active(q.isActive())
                .createdAt(q.getCreatedAt())
                .build();
    }

}
