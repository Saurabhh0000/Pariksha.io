package io.pariksha.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Marks;
import java.util.List;
import io.pariksha.entity.User;
import io.pariksha.enums.ExamType;


@Repository
public interface MarksRepository extends JpaRepository<Marks, Long>{
	
	List<Marks> findByStudent(User student);
	
	List<Marks> findByStudentAndExamType(User student, ExamType examType);
	
	List<Marks> findByStudentAndSubject(User student, String subject);
	
	List<Marks>
	findTop5ByUploadedByOrderByCreatedAtDesc(User teacher);

}
