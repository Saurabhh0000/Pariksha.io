package io.pariksha.dto.response;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

@Builder
@Getter
@Setter
public class ActivityResponse {

    private String type;

    private String title;

    private String description;

    private LocalDateTime createdAt;

}
