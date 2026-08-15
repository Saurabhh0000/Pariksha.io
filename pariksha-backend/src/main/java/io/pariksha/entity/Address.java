package io.pariksha.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.UpdateTimestamp;

import io.pariksha.enums.AddressType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "address")
@Setter
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Address {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(nullable = false)
	private String addressLine;
	
	@Column(nullable = false)
	private String city;
	
	@Column(nullable = false)
	private String state;
	
	@Column(nullable = false)
	private String pincode;

	@Column(nullable = false)
	private String country = "India";
	
	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private AddressType addressType;
	
	@UpdateTimestamp
	private LocalDateTime updatedAt;
}
