package io.pariksha.dto.request;

import io.pariksha.enums.Gender;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateTeacherRequest {
	@NotBlank(message = "First name is required")
	private String firstName;
	@NotBlank(message = "Last name is required")
	private String lastName;
	@NotBlank(message = "Email is required")
	@Email(message = "Please enter valid email address")
	private String email;
	
	@NotNull(message = "Gender is required")
	private Gender gender;
	
	private String phone;
	private String qualifications;
	private String experience;
	
	@Valid
	private AddressRequest permanentAddress;
	@Valid
	private AddressRequest currentAddress;

}
