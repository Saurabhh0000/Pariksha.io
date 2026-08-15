package io.pariksha.exceptions;

import org.springframework.http.HttpStatus;

public class GeminiApiException extends ParikshaException {

    public GeminiApiException(String message) {
    	super(
                message,
                HttpStatus.TOO_MANY_REQUESTS,
                "GEMINI_API_ERROR"
        );
    }
}
