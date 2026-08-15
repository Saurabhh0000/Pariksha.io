package io.pariksha.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.pariksha.dto.request.ChangePasswordRequest;
import io.pariksha.dto.request.LoginRequest;
import io.pariksha.dto.response.ApiResponse;
import io.pariksha.dto.response.AuthResponse;
import io.pariksha.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
	
	private final AuthService authService;
	
	@PostMapping("/login")
	public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request){
		
		AuthResponse authResponse = authService.login(request);
		
		return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
		
	}
	
	@PostMapping("/change-password")
	public ResponseEntity<ApiResponse<Void>> changePassword(@Valid HttpServletRequest httpRequest,@RequestBody ChangePasswordRequest request){
		
		Long userId = (Long) httpRequest.getAttribute("userId");
		
		authService.changePassword(userId, request);
		
		return ResponseEntity.ok(ApiResponse.success("Password changed successfully."));
		
	}

}
