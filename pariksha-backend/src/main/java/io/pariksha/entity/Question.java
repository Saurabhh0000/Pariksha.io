package io.pariksha.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.pariksha.enums.DifficultyLevel;
import io.pariksha.enums.ExamType;
import io.pariksha.enums.QuestionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "questions")
@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "created_by", nullable = false)
	private User createdBy;
	
	@Column(nullable = false)
	private String subject;
	
	@Column(nullable = false)
	private String topic;
	
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private QuestionType questionType;
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private DifficultyLevel difficultyLevel;
	
	@Column(nullable = false, columnDefinition = "TEXT")
	private String questionText;
	
	@Column(columnDefinition = "TEXT")
	private String options;
	
	@Column(nullable = false, columnDefinition = "TEXT")
	private String answer;
	
	@Column(columnDefinition = "TEXT")
	private String explanation;
	
	@Column(nullable = false)
	private Integer marks;
	
	@Column(nullable = false)
	private String classLevel;
	
	@Column(nullable = false)
	private boolean active = true;
	
	@CreationTimestamp
	@Column(updatable = false)
	private LocalDateTime createdAt;
	
	@UpdateTimestamp
	private LocalDateTime updatedAt;
}
