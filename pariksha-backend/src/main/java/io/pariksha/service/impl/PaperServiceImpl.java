package io.pariksha.service.impl;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AiPaperRequest;
import io.pariksha.dto.request.CreatePaperRequest;
import io.pariksha.dto.response.PaperQuestionResponse;
import io.pariksha.dto.response.QuestionPaperResponse;
import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.PaperQuestion;
import io.pariksha.entity.Question;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.exceptions.UnauthorizedException;
import io.pariksha.repository.ClassRoomRepository;
import io.pariksha.repository.PaperQuestionRepository;
import io.pariksha.repository.QuestionPaperRepository;
import io.pariksha.repository.QuestionRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.GeminiService;
import io.pariksha.service.PaperService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaperServiceImpl implements PaperService {
	
	private final UserRepository userRepository;
	private final TeacherRepository teacherRepository;
	private final QuestionRepository questionRepository;
	private final QuestionPaperRepository questionPaperRepository;
	private final PaperQuestionRepository paperQuestionRepository;
	private final ClassRoomRepository classRoomRepository;
	private final GeminiService geminiService;
	
	
	@Override
	@Transactional
	public QuestionPaperResponse createPaper(Long teacherUserId, CreatePaperRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository
		        .findById(request.getClassRoomId())
		        .orElseThrow(() -> new ResourceNotFoundException(
		                "ClassRoom", "id", request.getClassRoomId()));
		
		List<Question> selectedQuestions = new ArrayList<>();
		
		for(Long questionId : request.getQuestionIds()) {
			Question question = questionRepository.findById(questionId).orElseThrow(() -> new ResourceNotFoundException("Question", "id", questionId));
			
			if(!question.isActive()) {
				throw new BadRequestException("Question id=" + questionId + " is not active.");
			}
			selectedQuestions.add(question);
		}
		
		int totalMarks = selectedQuestions.stream().mapToInt(Question::getMarks).sum();
		
		QuestionPaper paper = QuestionPaper.builder()
		.createdBy(teacherUser)
		.classRoom(classRoom)
		.title(request.getTitle())
		.subject(request.getSubject())
		.classLevel(request.getClassLevel())
		.examType(request.getExamType())
		.durationMinutes(request.getDurationMinutes())
		.totalMarks(totalMarks)
		.instructions(request.getInstructions())
		.examStartTime(request.getExamStartTime())
		.examEndTime(request.getExamEndTime())
		.aiGenerated(false)
		.active(true)
		.build();
		
		questionPaperRepository.save(paper);
		
		List<PaperQuestion> paperQuestions = new ArrayList<>();
		
		for(int i = 0; i < selectedQuestions.size(); i++) {
			PaperQuestion pq = PaperQuestion.builder()
			.questionPaper(paper)
			.question(selectedQuestions.get(i))
			.questionOrder(i + 1)
			.build();
			
			paperQuestions.add(pq);
		}
		
		paperQuestionRepository.saveAll(paperQuestions);
		paper.setPaperQuestions(paperQuestions);
		
		log.info("Manual paper created: title={} | teacher={} | questions={}",
                request.getTitle(), teacherUserId,
                selectedQuestions.size());
		
		return mapToPaperResponse(paper, teacherUser);
	}

	@Override
	@Transactional
	public QuestionPaperResponse generateAiPaper(Long teacherUserId, AiPaperRequest request) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		ClassRoom classRoom = classRoomRepository
		        .findById(request.getClassRoomId())
		        .orElseThrow(() -> new ResourceNotFoundException(
		                "ClassRoom", "id", request.getClassRoomId()));

		
		List<Question> aiQuestions = geminiService.generateQuestions(request, teacherUser);
		
		if(aiQuestions.isEmpty()) {
			throw new BadRequestException("AI failed to generate questions. Please try again.");
		}
		
		questionRepository.saveAll(aiQuestions);
		
		int totalMarks = aiQuestions.stream().mapToInt(Question::getMarks).sum();
		
        QuestionPaper paper = QuestionPaper.builder()
                .createdBy(teacherUser)
                .classRoom(classRoom)
                .title(request.getTitle())
                .subject(request.getSubject())
                .classLevel(request.getClassLevel())
                .examType(request.getExamType())
                .durationMinutes(request.getDurationMinutes())
                .totalMarks(totalMarks)
                .instructions(request.getInstructions())
                .examStartTime(request.getExamStartTime())
                .examEndTime(request.getExamEndTime())
                .aiGenerated(true)       
                .active(true)
                .build();
        
        questionPaperRepository.save(paper);
        
        List<PaperQuestion> paperQuestions = new ArrayList<>();
        
        for(int i = 0; i < aiQuestions.size(); i++) {
        	PaperQuestion pq = PaperQuestion.builder()
        	.questionPaper(paper)
        	.question(aiQuestions.get(i))
        	.questionOrder(i + 1)
        	.build();
        	
        	paperQuestions.add(pq);
        }
        
        paperQuestionRepository.saveAll(paperQuestions);
        paper.setPaperQuestions(paperQuestions);

        log.info("AI paper generated: title={} | teacher={} | questions={}",
                request.getTitle(), teacherUserId, aiQuestions.size());
		
		return mapToPaperResponse(paper, teacherUser);
	}

	@Override
	public List<QuestionPaperResponse> getMyPapers(long teacherUserId) {
		
		User teacherUser = userRepository.findById(teacherUserId).orElseThrow(() -> new ResourceNotFoundException("Teacher", "id", teacherUserId));
		
		
		return questionPaperRepository.findByCreatedByAndActiveTrue(teacherUser)
				.stream()
				.map(paper -> mapToPaperResponse(paper, teacherUser))
				.collect(Collectors.toList());
	}

	@Override
	public QuestionPaperResponse getPaperById(Long paperId) {
		
		QuestionPaper questionPaper = questionPaperRepository.findById(paperId).orElseThrow(() -> new ResourceNotFoundException("QuestionPaper", "id", paperId));
		
		
		return mapToPaperResponse(questionPaper,questionPaper.getCreatedBy());
	}

	@Override
	@Transactional
	public void deletePaper(Long teacherUserId, Long paperId) {
		
		QuestionPaper paper = questionPaperRepository.findById(paperId).orElseThrow(() -> new ResourceNotFoundException("QuestionPaper", "id", paperId));
		
		if(!paper.getCreatedBy().getId().equals(teacherUserId)) {
			throw new UnauthorizedException("You can only delete your own papers.");
		}
		
		paper.setActive(false);
		questionPaperRepository.save(paper);
		
		log.info("Paper soft deleted: id={} by teacher={}",
                paperId, teacherUserId);
	}

	@Override
	public List<QuestionPaperResponse> getAllPapers() {
		return questionPaperRepository.findByActiveTrue()
        .stream()
        .map(paper -> mapToPaperResponse(paper, paper.getCreatedBy()))
        .collect(Collectors.toList());
	}
	
	// Mapper
	

	private QuestionPaperResponse mapToPaperResponse(
	        QuestionPaper paper, User createdBy) {

	    Teacher teacherProfile = teacherRepository
	            .findByUser(createdBy).orElse(null);

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
	                            .answer(pq.getQuestion().getAnswer())
	                            .explanation(pq.getQuestion().getExplanation())
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
	            .examType(paper.getExamType())
	            .durationMinutes(paper.getDurationMinutes())
	            .totalMarks(paper.getTotalMarks())
	            .instructions(paper.getInstructions())
	            .aiGenerated(paper.isAiGenerated())
	            .active(paper.isActive())
	            .questions(questionResponses)
	            .createdAt(paper.getCreatedAt())
	            .build();
	}

}
