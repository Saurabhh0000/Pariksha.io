package io.pariksha.service;

import org.springframework.stereotype.Service;

import io.pariksha.dto.request.ChangePasswordRequest;
import io.pariksha.dto.request.LoginRequest;
import io.pariksha.dto.response.AuthResponse;

@Service
public interface AuthService {
	
	AuthResponse login(LoginRequest request);
	
	void changePassword(Long userId, ChangePasswordRequest request);

}
