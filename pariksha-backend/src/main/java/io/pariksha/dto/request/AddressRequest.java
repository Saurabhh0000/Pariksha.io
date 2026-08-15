package io.pariksha.dto.request;

import io.pariksha.enums.AddressType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddressRequest {
	
	@NotBlank(message = "Address line is required")
	private String addressLine;
	
	@NotBlank(message = "City is required")
	private String city;
	
	@NotBlank(message = "State is required")
	private String state;
	
	@NotBlank(message = "Pincode is required")
	@Pattern(regexp = "^[1-9][0-9]{5}$",
	        message = "Please enter a valid 6-digit pincode")
	private String pincode;
	
	private String country = "India";
	
	@NotNull(message = "Address type is required (PERMANENT or CURRENT)")
	private AddressType addressType;

}
