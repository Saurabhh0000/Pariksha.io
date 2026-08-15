package io.pariksha.config;

import io.pariksha.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter           jwtAuthFilter;
    private final UserDetailsService      userDetailsService;
    private final CorsConfigurationSource corsConfigurationSource; // ← inject

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http)
            throws Exception {

        http
            // ── Disable CSRF — REST APIs don't need it ──
            .csrf(csrf -> csrf.disable())

            // ── CORS — use our CorsConfigurationSource bean ──
            .cors(cors -> cors
                .configurationSource(corsConfigurationSource))  // ← fixed

            // ── Stateless session — JWT handles auth ──
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))

            // ── Route permissions ──
            .authorizeHttpRequests(auth -> auth

                // Public — no token needed
                .requestMatchers(
                    "/api/auth/login",
                    "/api/auth/change-password",
                    "/actuator/health",
                    "/api/test/**",
                    "/uploads/**" 
                ).permitAll()

                // Admin only
                .requestMatchers("/api/admin/**")
                    .hasAuthority("ROLE_ADMIN")

                // Teacher only
                .requestMatchers("/api/teacher/**")
                    .hasAuthority("ROLE_TEACHER")

                // Student only
                .requestMatchers("/api/student/**")
                    .hasAuthority("ROLE_STUDENT")

                // All logged in users
                .requestMatchers("/api/profile/**")
                    .hasAnyAuthority(
                        "ROLE_ADMIN",
                        "ROLE_TEACHER",
                        "ROLE_STUDENT")

                // PDF download
                .requestMatchers("/api/pdf/**")
                    .hasAnyAuthority(
                        "ROLE_TEACHER",
                        "ROLE_STUDENT")

                // Questions + Papers
                .requestMatchers("/api/questions/**")
                    .hasAnyAuthority(
                        "ROLE_ADMIN",
                        "ROLE_TEACHER")

                .requestMatchers("/api/papers/**")
                    .hasAnyAuthority(
                        "ROLE_ADMIN",
                        "ROLE_TEACHER",
                        "ROLE_STUDENT")

                // Everything else needs auth
                .anyRequest().authenticated()
            )

            // ── Add JWT filter before Spring's auth filter ──
            .addFilterBefore(
                jwtAuthFilter,
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider =
                new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }
}