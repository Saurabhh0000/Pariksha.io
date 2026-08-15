package io.pariksha.service.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import io.pariksha.dto.request.ChangePasswordRequest;
import io.pariksha.dto.request.LoginRequest;
import io.pariksha.dto.response.AuthResponse;
import io.pariksha.entity.User;
import io.pariksha.enums.UserStatus;
import io.pariksha.exceptions.AccountNotActiveException;
import io.pariksha.exceptions.BadRequestException;
import io.pariksha.exceptions.InvalidCredentialsException;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.repository.UserRepository;
import io.pariksha.security.JwtUtil;
import io.pariksha.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService{
	
	private final UserRepository userReposiotry;
	private final PasswordEncoder passwordEncoder;
	private final JwtUtil jwtUtil;

	@Override
	public AuthResponse login(LoginRequest request) {
		
		User user = userReposiotry.findByEmail(request.getEmail()).orElseThrow(() -> new InvalidCredentialsException());
		
		if(!passwordEncoder.matches(request.getPassword(), user.getPassword()))
		{
			throw new InvalidCredentialsException();
		}
		
//		if(user.getStatus() == UserStatus.PENDING)
//		{
//			throw new AccountNotActiveException("Your account is pending admin approval. " +
//	                "Please wait for the admin to activate your account.");
//		}
		
		if(user.getStatus() == UserStatus.INACTIVE)
		{
			throw new AccountNotActiveException("Your account has been deactivated. " +
	                "Please contact the admin.");
		}
		
		String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());
		
		log.info("User logged in : {} | Role : {}",user.getEmail(), user.getRole());
		
		return AuthResponse.builder().token(token).email(user.getEmail()).role(user.getRole()).status(user.getStatus()).firstLogin(user.isFirstLogin()).message("Login successful").build();
	}

	@Override
	public void changePassword(Long userId, ChangePasswordRequest request) {
		
		User user = userReposiotry.findById(userId).orElseThrow(() -> new ResourceNotFoundException("User", "id", userId));
		
		if(!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
			throw new BadRequestException("Current password is incorrect. Please try again.");
		}
		
		if(!request.getNewPassword().equals(request.getConfirmPassword())) {
			throw new BadRequestException("New password and confirm password do not match.");
		}
		
		if(passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
			throw new BadRequestException("New password cannot be the same as your current password.");
		}
		
		user.setPassword(passwordEncoder.encode(request.getNewPassword()));
		user.setFirstLogin(false);
		userReposiotry.save(user);
		
		log.info("Password changed for UserId : {}",userId);
		
		
	}

}
