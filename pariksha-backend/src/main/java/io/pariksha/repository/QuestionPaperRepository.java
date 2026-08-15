package io.pariksha.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.User;



@Repository
public interface QuestionPaperRepository extends JpaRepository<QuestionPaper, Long> {
	
	List<QuestionPaper> findByCreatedByAndActiveTrue(User teacher);
	
	List<QuestionPaper> findByActiveTrue();
	
	List<QuestionPaper> findByCreatedByAndSubjectAndActiveTrue(User teacher, String subject);
	
	List<QuestionPaper> findByCreatedByAndAiGeneratedAndActiveTrue(User teacher, boolean aiGenerated);
	
	List<QuestionPaper> findByClassRoomAndActiveTrue(ClassRoom classRoom);
	
	
	List<QuestionPaper>
	findTop5ByCreatedByAndActiveTrueOrderByCreatedAtDesc(User teacher);
	
	List<QuestionPaper> findByExamEndTimeBefore(LocalDateTime dateTime);

}
