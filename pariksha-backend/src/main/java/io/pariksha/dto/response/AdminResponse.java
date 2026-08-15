package io.pariksha.dto.response;

import io.pariksha.enums.Role;
import io.pariksha.enums.UserStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AdminResponse {
    private Long id;
    private String email;
    private Role role;
    private UserStatus status;
}