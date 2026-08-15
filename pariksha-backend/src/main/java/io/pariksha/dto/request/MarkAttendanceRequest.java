package io.pariksha.dto.request;

import java.time.LocalDate;

import io.pariksha.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class MarkAttendanceRequest {

    @NotNull(message = "Student id is required")
    private Long studentUserId;

    @NotNull(message = "Class Room id is required")
    private Long classRoomId;

    @NotNull(message = "Date is required")
    private LocalDate date;

    @NotNull(message = "Attendance status is required")
    private AttendanceStatus status;
}