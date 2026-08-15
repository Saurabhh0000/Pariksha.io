package io.pariksha.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long>{
	
	Optional<Teacher> findByUser(User user);
	
	Optional<Teacher> findByUserId(Long userId);
	
	boolean existsByTeacherCode(String teacherCode);
	

}
