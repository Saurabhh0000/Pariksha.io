package io.pariksha.dto.request;

import io.pariksha.enums.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter

public class TeacherAddStudentRequest {
	
	@NotBlank(message = "First Name is required")
	private String firstName;
	@NotBlank(message = "Last name is required")
	private String lastName;
	@NotNull(message = "Gender is required")
	private Gender gender;
	@NotBlank(message = "Email is required")
	private String email;
	@NotBlank(message = "Class name is required")
	private String className;
	@NotBlank(message = "Section is required")
	private String section;
	private String phone;
	private String fatherName;
	private String fatherContact;
	private String motherName;
	
	@Valid
	private AddressRequest permanentAddress;
	@Valid
	private AddressRequest currentAddress;

}
