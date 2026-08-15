package io.pariksha.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class CreateClassRequest {
	
	@NotBlank(message = "Class name is required")
	private String className;
	
	@NotBlank(message = "Section is required")
	private String section;

}
