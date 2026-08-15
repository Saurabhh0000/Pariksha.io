package io.pariksha.dto.request;

import java.time.LocalTime;

import io.pariksha.enums.DayOfWeek;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TimetableRequest {

    @NotNull(message = "Class room id is required")
    private Long classRoomId;

    @NotNull(message = "Day of week is required")
    private DayOfWeek day;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotNull(message = "Time slot start is required")
    private LocalTime timeSlotStart;

    @NotNull(message = "Time slot end is required")
    private LocalTime timeSlotEnd;

    private String roomNumber;
}
