package io.pariksha.dto.request;

import java.time.LocalDateTime;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.ExamType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AiPaperRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Subject is required")
    private String subject;

    @NotBlank(message = "Topic is required")
    private String topic;

    @NotBlank(message = "Class level is required")
    private String classLevel;
    
    @NotNull(message = "Class room ID is required")
    private Long classRoomId;
    
    @NotNull(message = "Exam type is required")
    private ExamType examType;

    @NotNull(message = "Duration is required")
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;

    // How many questions to generate
    @NotNull(message = "Number of questions is required")
    @Min(value = 1, message = "At least 1 question required")
    private Integer numberOfQuestions;

    // Difficulty of generated questions
    @NotNull(message = "Difficulty level is required")
    private DifficultyLevel difficultyLevel;

    // Marks per question
    @NotNull(message = "Marks per question is required")
    @Min(value = 1, message = "Marks must be at least 1")
    private Integer marksPerQuestion;

    // Optional instructions
    private String instructions;
    
    private LocalDateTime examStartTime;
    
    private LocalDateTime examEndTime;
}