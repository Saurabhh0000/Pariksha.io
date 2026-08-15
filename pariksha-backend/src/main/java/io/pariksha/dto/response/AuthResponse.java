package io.pariksha.dto.response;

import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
public class AuthResponse {

	private String token;
	private String email;
	
	private Role role;
	
	private boolean firstLogin;
    private UserStatus status;

	
	private String message;
}
