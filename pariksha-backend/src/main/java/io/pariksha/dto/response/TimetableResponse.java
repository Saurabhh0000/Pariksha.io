package io.pariksha.dto.response;

import java.time.LocalTime;

import io.pariksha.enums.DayOfWeek;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class TimetableResponse {

    private Long id;
    private Long classRoomId;
    private String className;
    private String section;
    private Long teacherId;
    private String teacherName;
    private DayOfWeek day;
    private String subject;
    private LocalTime timeSlotStart;
    private LocalTime timeSlotEnd;
    private String roomNumber;
}
