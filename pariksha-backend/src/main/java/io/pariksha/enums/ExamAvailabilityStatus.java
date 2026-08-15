package io.pariksha.enums;

// What student sees when viewing a paper
public enum ExamAvailabilityStatus {

    UPCOMING,       // examStartTime is in future
    AVAILABLE,      // can start now
    IN_PROGRESS,    // student already started
    SUBMITTED,      // student submitted
    MISSED,         // examEndTime passed, student never started
    EXPIRED,        // student started but time ran out
    EVALUATED       // result available
}