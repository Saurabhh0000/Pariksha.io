package io.pariksha.dto.response;

import io.pariksha.enums.Gender;
import io.pariksha.enums.UserStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class StudentResponse {
	
	private Long id;
	private Long userId;
	private String studentRollCode;
	private String firstName;
	private String lastName;
	private String email;
	private Gender gender;
	private String phone;
	private String className;
	private String section;
	
	private AddressResponse permanentAddress;
	private AddressResponse currentAddress;
	
	private String fatherName;
	private String fatherContact;
	
	private String motherName;
	
	private String photoPath;
	
	private UserStatus status;

}
