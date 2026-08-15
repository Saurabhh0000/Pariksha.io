package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class DuplicateResourceException extends ParikshaException {
	
	public DuplicateResourceException(String message)
	{
		super(message, HttpStatus.CONFLICT,"DUPLICATE_RESOURCE");
	}

}
