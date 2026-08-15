package io.pariksha.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateTeacherRequest {
	
	private String firstName;
	private String lastName;
	private String phone;
	private String qualifications;
	private String experience;
	
	private AddressRequest permanentAddress;
	private AddressRequest currentAddress;

}
