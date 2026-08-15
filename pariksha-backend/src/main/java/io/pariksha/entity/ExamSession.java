package io.pariksha.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;

import io.pariksha.enums.ExamSessionStatus;
import jakarta.persistence.CascadeType;
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
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "exam_sessions", uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "paper_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExamSession {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "student_id", nullable = false)
	private User student;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "paper_id", nullable = false)
	private QuestionPaper questionPaper;
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ExamSessionStatus status;
	
	@Column(nullable = false)
	private LocalDateTime startedAt;
	
	@Column(nullable = false)
	private LocalDateTime expiresAt;
	
	private LocalDateTime submittedAt;
	
	private Double totalMarksObtained;
	
	private Integer totalMarks;
	
	@OneToMany(mappedBy = "examSession",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
   @Builder.Default
   private List<StudentAnswer> answers = new ArrayList<>();
	
	@CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
	
	

}
