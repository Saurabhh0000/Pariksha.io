package io.pariksha.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.SubjectAllocation;
import io.pariksha.entity.User;



@Repository
public interface SubjectAllocationRepository extends JpaRepository<SubjectAllocation, Long> {
	
	List<SubjectAllocation> findByTeacher(User teacher);
	
	List<SubjectAllocation> findByClassRoom(ClassRoom classRoom);
	
	Optional<SubjectAllocation> findByTeacherAndClassRoomAndSubject(User teacher, ClassRoom classRoom, String subject);
	
	boolean existsByTeacherAndClassRoomAndSubject(User teacher, ClassRoom classRoom, String subject);
	
	boolean existsByTeacherAndClassRoom(User teacher, ClassRoom classRoom);
	
	List<SubjectAllocation> findByTeacherAndClassRoom(User teacher, ClassRoom classRoom);
	
	void deleteByTeacherAndClassRoom(User teacher, ClassRoom classRoom);
	
	Optional<SubjectAllocation> findByClassRoomAndSubject(
	        ClassRoom classRoom,
	        String subject);
	
	boolean existsByClassRoomAndSubject(
	        ClassRoom classRoom,
	        String subject);
	

}
