package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class UnauthorizedException extends ParikshaException {
	
	public UnauthorizedException(String message)
	{
		super(message, HttpStatus.FORBIDDEN, "UNAUTHORIZED_ACCESS");
	}

}
