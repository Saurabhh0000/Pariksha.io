package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

import lombok.Getter;

@Getter
public class ParikshaException extends RuntimeException {
	
	private final HttpStatus status;
	
	private final String errorCode;
	
	public ParikshaException(String message, HttpStatus status, String errorCode)
	{
		super(message);
		this.status = status;
		this.errorCode = errorCode;
	}

}
