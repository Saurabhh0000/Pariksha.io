package io.pariksha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.PaperQuestion;
import io.pariksha.entity.QuestionPaper;

@Repository
public interface PaperQuestionRepository extends JpaRepository<PaperQuestion, Long> {
	
	List<PaperQuestion> findByQuestionPaperOrderByQuestionOrderAsc(QuestionPaper paper);
	
	void deleteByQuestionPaper(QuestionPaper paper);
	

}
