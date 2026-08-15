package io.pariksha.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Question;
import io.pariksha.entity.User;
import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.QuestionType;




@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
	
	List<Question> findByCreatedByAndActiveTrue(User teacher);
	
	List<Question> findByActiveTrue();
	
	List<Question> findBySubjectAndActiveTrue(String subject);
	
	List<Question> findBySubjectAndTopicAndActiveTrue(String subject, String topic);
	
	List<Question> findBySubjectAndQuestionTypeAndActiveTrue(String subject, QuestionType questionType);
	
	List<Question> findByClassLevelAndActiveTrue(String classLevel);
	
	@Query("SELECT q FROM Question q WHERE " +
	           "(:subject IS NULL OR q.subject = :subject) AND " +
	           "(:topic IS NULL OR q.topic = :topic) AND " +
	           "(:questionType IS NULL OR q.questionType = :questionType) AND " +
	           "(:difficultyLevel IS NULL OR q.difficultyLevel = :difficultyLevel) AND " +
	           "(:classLevel IS NULL OR q.classLevel = :classLevel) AND " +
	           "q.active = true")
	List<Question> filterQuestion(@Param("subject") String subject, @Param("topic") String topic, @Param("questionType") QuestionType questionType, @Param("difficultyLevel") DifficultyLevel difficultyLevel, @Param("classLevel") String classLevel);
	
	@Query("SELECT DISTINCT q.subject FROM Question q WHERE q.active = true")
	List<String> findDistinctSubjects();
	
	@Query("SELECT DISTINCT q.topic FROM Question q " +
	           "WHERE q.subject = :subject AND q.active = true")
	List<String> findDistinctTopicsBySubject(@Param("subject") String subject);

}
