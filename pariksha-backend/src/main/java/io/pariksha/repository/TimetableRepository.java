package io.pariksha.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Timetable;
import java.util.List;
import io.pariksha.entity.User;
import io.pariksha.enums.DayOfWeek;
import io.pariksha.entity.ClassRoom;




@Repository
public interface TimetableRepository extends JpaRepository<Timetable, Long>{
	
	List<Timetable> findByClassRoomOrderByDayAscTimeSlotStartAsc(ClassRoom classRoom);
	
	List<Timetable> findByTeacher(User teacher);
	List<Timetable> findByTeacherAndDay(User teacher, DayOfWeek day);
	
	List<Timetable> findByClassRoomAndDay(ClassRoom classRoom, DayOfWeek day);
	

}
