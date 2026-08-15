package io.pariksha.service;

import java.util.List;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.AiPaperRequest;
import io.pariksha.dto.request.CreatePaperRequest;
import io.pariksha.dto.response.QuestionPaperResponse;

@Service
public interface PaperService {
	
	QuestionPaperResponse createPaper(Long teacherUserId, CreatePaperRequest request);
	
	QuestionPaperResponse generateAiPaper(Long teacherUserId, AiPaperRequest request);
	
	List<QuestionPaperResponse> getMyPapers(long teacherUserId);
	
	QuestionPaperResponse getPaperById(Long paperId);
	
	void deletePaper(Long teacherUserId, Long paperId);
	
	List<QuestionPaperResponse> getAllPapers();

}
