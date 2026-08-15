package io.pariksha.exceptions;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import io.pariksha.dto.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;

// Catches ALL exceptions globally and returns clean JSON to frontend
// Frontend always gets consistent error format — never Spring's default error page
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // ── Handles all our custom Pariksha exceptions ──
    @ExceptionHandler(ParikshaException.class)
    public ResponseEntity<ApiResponse<Object>> handleParikshaException(
            ParikshaException ex) {

        log.error("ParikshaException: [{}] {}", ex.getErrorCode(), ex.getMessage());

        ApiResponse<Object> response = ApiResponse.builder()
                .success(false)
                .message(ex.getMessage())          // real message shown to frontend
                .timestamp(java.time.LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, ex.getStatus());
    }

    // ── Handles @Valid annotation failures on DTOs ──
    // e.g. blank email, invalid format
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Map<String, String>>> handleValidationErrors(
            MethodArgumentNotValidException ex) {

        Map<String, String> errors = new HashMap<>();

        ex.getBindingResult().getAllErrors().forEach(error -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });

        log.error("Validation failed: {}", errors);

        ApiResponse<Map<String, String>> response = ApiResponse.<Map<String, String>>builder()
                .success(false)
                .message("Validation failed. Please check the fields.")
                .data(errors)                       // shows exactly which field failed
                .timestamp(java.time.LocalDateTime.now())
                .build();

        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    // ── Handles Spring Security access denied ──
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiResponse<Object>> handleAccessDenied(
            AccessDeniedException ex) {

        log.error("Access denied: {}", ex.getMessage());

        return new ResponseEntity<>(
                ApiResponse.error("You do not have permission to perform this action."),
                HttpStatus.FORBIDDEN
        );
    }

    // ── Handles Spring Security bad credentials ──
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiResponse<Object>> handleBadCredentials(
            BadCredentialsException ex) {

        return new ResponseEntity<>(
                ApiResponse.error("Invalid email or password. Please try again."),
                HttpStatus.UNAUTHORIZED
        );
    }

    // ── Catches everything else — prevents leaking stack traces ──
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Object>> handleGenericException(
            Exception ex) {

        // Log full stack trace for developer — but never send to frontend
        log.error("Unexpected error occurred: ", ex);

        return new ResponseEntity<>(
                ApiResponse.error("Something went wrong. Please try again later."),
                HttpStatus.INTERNAL_SERVER_ERROR
        );
    }
}