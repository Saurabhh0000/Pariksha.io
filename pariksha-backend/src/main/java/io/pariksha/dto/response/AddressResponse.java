package io.pariksha.dto.response;

import io.pariksha.enums.AddressType;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
public class AddressResponse {
	
	private Long id;
	private String addressLine;
	private String city;
	private String state;
	private String pincode;
	private String country;
	private AddressType addressType;

}
