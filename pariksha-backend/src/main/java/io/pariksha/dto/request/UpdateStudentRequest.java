package io.pariksha.dto.request;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateStudentRequest {
	private String firstName;
	private String lastName;
	private String phone;
	private String fatherName;
	private String fatherContact;
	private String motherName;
	
	private AddressRequest permanentAddress;
    private AddressRequest currentAddress;

}
