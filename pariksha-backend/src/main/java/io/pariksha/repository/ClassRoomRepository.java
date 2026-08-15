package io.pariksha.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.User;


@Repository
public interface ClassRoomRepository extends JpaRepository<ClassRoom, Long>{
	
	Optional<ClassRoom> findByClassNameAndSection(String className, String section);
	
	boolean existsByClassNameAndSection(String className, String section);
	Optional<ClassRoom> findByMentorTeacher(User mentorTeacher);
	boolean existsByMentorTeacher(User mentorTeacher);
	
	
	
	

}
