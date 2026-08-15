package io.pariksha.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.User;
import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;

@Repository
public interface UserRepository extends JpaRepository<User, Long>{
	
	Optional<User> findByEmail(String email); // it used during Login - find By User email
	
    boolean existsByEmail(String email); // check email already exist during registration
    
    
    List<User> findByRole(Role role); ; // Admin get all teachers
    
    List<User> findByRoleAndStatus(Role role, UserStatus status); // Admin get all pending students
   
   
	

}
