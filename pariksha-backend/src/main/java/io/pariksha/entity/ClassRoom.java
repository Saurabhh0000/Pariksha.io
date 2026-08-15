package io.pariksha.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "classes", uniqueConstraints = @UniqueConstraint(columnNames = {"class_name", "section"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassRoom {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(name = "class_name", nullable = false)
	private String className;
	
	@Column(name = "section", nullable = false)
	private String section;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "mentor_teacher_id")
	private User mentorTeacher;
	
	@CreationTimestamp
	@Column(updatable = false)
	private LocalDateTime createdAt;

}
