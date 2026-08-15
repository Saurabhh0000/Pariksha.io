package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class BadRequestException extends ParikshaException {
	
	public BadRequestException(String message)
	{
		super(message, HttpStatus.BAD_REQUEST,"BAD_REQUEST");
	}

}
