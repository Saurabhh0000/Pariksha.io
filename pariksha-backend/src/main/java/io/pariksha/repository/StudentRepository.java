package io.pariksha.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Student;
import io.pariksha.entity.User;
import java.util.List;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    Optional<Student> findByUser(User user);

    Optional<Student> findByUserId(Long userId);

    boolean existsByStudentRollCode(String studentRollCode);

    List<Student> findByClassNameAndSection(String className, String section);

    long countByClassNameAndSection(String className, String section);

    // Recent students added by a specific teacher
    List<Student> findTop5ByCreatedByOrderByCreatedAtDesc(User teacher);

    // Recent students in a class
    List<Student> findTop10ByClassNameAndSectionOrderByCreatedAtDesc(
            String className,
            String section
    );
    
}
