package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class AccountNotActiveException extends ParikshaException {
	
	public AccountNotActiveException(String message)
	{
		super(message, HttpStatus.FORBIDDEN, "ACCOUNT_NOT_ACTIVE");
	}

}
