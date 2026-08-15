package io.pariksha.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// Standard wrapper for ALL API responses in Pariksha.io
// Every controller returns this — consistent for frontend
@Getter
@Setter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL) // hides null fields from JSON
public class ApiResponse<T> {

    private boolean success;
    private String message;
    private T data;                     // any type — list, object, string
    private LocalDateTime timestamp;

    // Quick factory methods
    public static <T> ApiResponse<T> success(String message, T data) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .data(data)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> success(String message) {
        return ApiResponse.<T>builder()
                .success(true)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }

    public static <T> ApiResponse<T> error(String message) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
    }
}