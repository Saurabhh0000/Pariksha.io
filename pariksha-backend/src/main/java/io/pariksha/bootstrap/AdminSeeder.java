package io.pariksha.bootstrap;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import io.pariksha.entity.User;
import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;
import io.pariksha.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminSeeder implements CommandLineRunner{
	
	private final UserRepository userRepository;
	
	private final PasswordEncoder passwordEncoder;

	@Override
	public void run(String... args) throws Exception {
		
		String adminEmail = "admin@pariksha.io";
		
		if(!userRepository.existsByEmail(adminEmail))
		{
			User admin = User.builder().email(adminEmail).password(passwordEncoder.encode("Admin@123")).role(Role.ROLE_ADMIN)
			.status(UserStatus.ACTIVE).firstLogin(false).build();
			
			userRepository.save(admin);
			
			log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("  ✅ Default Admin Created for Pariksha.io");
            log.info("  📧 Email    : {}", adminEmail);
            log.info("  🔑 Password : Admin@123");
            log.info("  ⚠️  Change this password after first login!");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		}else{
			log.info("✅ Admin already exists — skipping seed.");
		}
	}

}
