package io.pariksha.dto.response;

import java.time.LocalDateTime;

import io.pariksha.enums.Gender;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class TeacherResponse {
	
	private Long id;
	private Long userId;
	private String teacherCode;
	private String firstName;
	private String lastName;
	private Gender gender;
	private String email;
	private String phone;
	private String qualifications;
	private String experience;
	
	private Boolean isMentor;
	
	private AddressResponse permanentAddress;
	private AddressResponse currentAddress;
	
	private String photoPath;
	
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

}
