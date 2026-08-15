package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class ResourceNotFoundException extends ParikshaException {
	
	public ResourceNotFoundException(String resource, String field, Object value)
	{
		super(resource +" not found with "+field+" : "+value, HttpStatus.NOT_FOUND,"RESOURCE_NOT_FOUND");
	}

}
