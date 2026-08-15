package io.pariksha.repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Attendance;
import io.pariksha.entity.ClassRoom;
import io.pariksha.entity.User;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long>{
	
	List<Attendance> findByUserAndDateBetween(User user,LocalDate from, LocalDate to);
	
	List<Attendance> findByClassRoomAndDate(ClassRoom classRoom, LocalDate date);
	
	Optional<Attendance> findByUserAndDate(User user, LocalDate date);
	
	List<Attendance> findByUser(User user);
	List<Attendance> findByClassRoom(ClassRoom classRoom);
	
	List<Attendance>
	findTop5ByMarkedByOrderByMarkedAtDesc(User teacher);

}
