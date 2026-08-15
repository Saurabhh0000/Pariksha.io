package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class InvalidCredentialsException extends ParikshaException {
	
	public InvalidCredentialsException()
	{
		super("Invalid email or password. Please try again.", HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS");
	}

}
