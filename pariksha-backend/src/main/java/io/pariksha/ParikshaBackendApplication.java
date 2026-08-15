package io.pariksha;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ParikshaBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(ParikshaBackendApplication.class, args);
	}

}
