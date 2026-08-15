package io.pariksha.entity;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.pariksha.enums.ExamType;
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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "question_papers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionPaper {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "created_by", nullable = false)
	private User createdBy;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "class_id")
	private ClassRoom classRoom;
	
	@Column(nullable = false)
	private String title;
	
	@Column(nullable = false)
	private String subject;
	
	@Column(nullable = false)
	private String classLevel;
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private ExamType examType;
	
	@Column(nullable = false)
	private Integer durationMinutes;
	
	@Column(nullable = false)
	private Integer totalMarks;
	
	@Column(columnDefinition = "TEXT")
	private String instructions;
	
	@Column
	private LocalDateTime examStartTime;
	
	@Column
	private LocalDateTime examEndTime;
	
	@Column(nullable = false)
	private boolean aiGenerated = false;
	
	@Column(nullable = false)
	private boolean active = true;
	
	@OneToMany(mappedBy = "questionPaper",
            cascade = CascadeType.ALL,
            orphanRemoval = true)
   @Builder.Default
   private List<PaperQuestion> paperQuestions = new ArrayList<>();
	
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
	
	

}
