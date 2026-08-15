package io.pariksha.scheduler;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import io.pariksha.entity.ExamSession;
import io.pariksha.enums.ExamSessionStatus;
import io.pariksha.repository.ExamSessionRepository;
import io.pariksha.service.impl.ExamServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class ExamAutoSubmitScheduler {

    private final ExamSessionRepository sessionRepository;
    private final ExamServiceImpl examService;

    @Scheduled(fixedRate = 60000) // Every 1 minute
    public void autoSubmitExpiredExams() {

        log.info("Checking expired exams...");

        // Sweep 1: sessions the student started but never submitted
        List<ExamSession> expiredSessions =
                sessionRepository.findByStatusAndExpiresAtBefore(
                        ExamSessionStatus.IN_PROGRESS,
                        LocalDateTime.now());

        for (ExamSession session : expiredSessions) {
            examService.autoSubmitExpiredSession(session);
        }
        if (!expiredSessions.isEmpty()) {
            log.info("Auto submitted {} in-progress exam(s).", expiredSessions.size());
        }

        // Sweep 2: students who never started the exam at all
        int missedCount = examService.autoSubmitMissedExams();
        if (missedCount > 0) {
            log.info("Auto zero-submitted {} missed exam(s).", missedCount);
        }
    }
}