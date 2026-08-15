package io.pariksha.service.impl;

import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.pariksha.dto.request.AiPaperRequest;
import io.pariksha.dto.response.AiEvaluationResponse;
import io.pariksha.entity.Question;
import io.pariksha.entity.User;
import io.pariksha.enums.QuestionType;
import io.pariksha.service.GeminiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import io.pariksha.exceptions.GeminiApiException;
import org.springframework.web.client.HttpStatusCodeException;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiServiceImpl implements GeminiService {

    @Value("${application.gemini.api-key}")
    private String geminiApiKey;
    
    
    private static final String GEMINI_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/" +
            "gemini-3.1-flash-lite:generateContent?key=";


    private final ObjectMapper objectMapper;
    private final RestTemplate restTemplate;

    @Override
    public List<Question> generateQuestions(
            AiPaperRequest request, User teacher) {

        String prompt = buildPrompt(request);

        log.info("Calling Gemini AI for subject={} topic={} questions={}",
                request.getSubject(), request.getTopic(),
                request.getNumberOfQuestions());

        String geminiResponse = callGeminiApi(prompt);

        return parseGeminiResponse(geminiResponse, request, teacher);
    }


    private String buildPrompt(AiPaperRequest request) {
        return String.format("""
            You are an expert teacher creating exam questions.
            Generate exactly %d exam questions for the following:

            Subject: %s
            Topic: %s
            Class Level: %s
            Difficulty: %s
            Marks per question: %d

            Return ONLY a valid JSON array. No extra text before or after.
            Each question must follow this exact format:

            [
              {
                "questionType": "MCQ",
                "questionText": "The question here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "answer": "Option B",
                "explanation": "Brief explanation of why Option B is correct",
                "marks": %d
              }
            ]

            Rules:
            - questionType must be one of: MCQ, SHORT_ANSWER, LONG_ANSWER, TRUE_FALSE, FILL_IN_THE_BLANK
            - For MCQ: provide exactly 4 options
            - For TRUE_FALSE: options must be ["True", "False"]
            - For SHORT_ANSWER, LONG_ANSWER, FILL_IN_THE_BLANK: options must be []
            - All questions must be related to %s - %s
            - Difficulty must match: %s
            - Return ONLY the JSON array, nothing else
            """,
                request.getNumberOfQuestions(),
                request.getSubject(),
                request.getTopic(),
                request.getClassLevel(),
                request.getDifficultyLevel().name(),
                request.getMarksPerQuestion(),
                request.getMarksPerQuestion(),
                request.getSubject(),
                request.getTopic(),
                request.getDifficultyLevel().name()
        );
    }



    private String callGeminiApi(String prompt) {
        try {
            String requestBody = String.format("""
                {
                  "contents": [
                    {
                      "parts": [
                        {
                          "text": %s
                        }
                      ]
                    }
                  ],
                  "generationConfig": {
                    "temperature": 0.7,
                    "maxOutputTokens": 8192
                  }
                }
                """, objectMapper.writeValueAsString(prompt));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(
                    requestBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    GEMINI_URL + geminiApiKey,
                    HttpMethod.POST,
                    entity,
                    String.class);

            JsonNode root = objectMapper.readTree(response.getBody());
            String text = root
                    .path("candidates")
                    .path(0)
                    .path("content")
                    .path("parts")
                    .path(0)
                    .path("text")
                    .asText();

            log.info("Gemini AI responded successfully");
            return text;

        }catch (HttpStatusCodeException e) {

            log.error("Status Code: {}", e.getStatusCode());
            log.error("Response Body:\n{}", e.getResponseBodyAsString());

            String body = e.getResponseBodyAsString();

            if (body.contains("RESOURCE_EXHAUSTED")
                    || body.contains("Quota exceeded")) {

                throw new GeminiApiException(
                        "Gemini AI quota exceeded. Please try again later.");
            }

            if (body.contains("NOT_FOUND")) {

                throw new GeminiApiException(
                        "Gemini AI model not found.");
            }

            throw new GeminiApiException(
                    "Gemini AI service is currently unavailable.");

        }catch (Exception e) {

            log.error("Gemini API call failed", e);

            throw new GeminiApiException(
                    "Unable to connect to Gemini AI.");
        }
    }



    private List<Question> parseGeminiResponse(
            String response, AiPaperRequest request, User teacher) {

        List<Question> questions = new ArrayList<>();

        try {
            String cleanJson = response
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();

            JsonNode questionsArray = objectMapper.readTree(cleanJson);

            for (JsonNode node : questionsArray) {

                QuestionType questionType = QuestionType.valueOf(
                        node.path("questionType").asText("MCQ"));

                String optionsJson = null;
                if (node.has("options") && !node.path("options").isEmpty()) {
                    optionsJson = objectMapper
                            .writeValueAsString(node.path("options"));
                }

                Question question = Question.builder()
                        .createdBy(teacher)
                        .subject(request.getSubject())
                        .topic(request.getTopic())
                        .questionType(questionType)
                        .difficultyLevel(request.getDifficultyLevel())
                        .questionText(node.path("questionText").asText())
                        .options(optionsJson)
                        .answer(node.path("answer").asText())
                        .explanation(node.path("explanation").asText(""))
                        .marks(request.getMarksPerQuestion())
                        .classLevel(request.getClassLevel())
                        .active(true)
                        .build();

                questions.add(question);
            }

            log.info("Parsed {} questions from Gemini response",
                    questions.size());

        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
            throw new RuntimeException(
                "Failed to parse AI generated questions. Please try again.");
        }

        return questions;
    }
    
    // Ai Response For short and Long Answer suggestion
    
    @Override
    public AiEvaluationResponse evaluateAnswer(
            String questionText,
            String correctAnswer,
            String studentAnswer,
            Integer maxMarks) {

        String prompt = buildEvaluationPrompt(
                questionText, correctAnswer, studentAnswer, maxMarks);

        log.info("Calling Gemini AI for answer evaluation");

        String geminiResponse = callGeminiApi(prompt);

        return parseEvaluationResponse(geminiResponse, maxMarks);
    }

    private String buildEvaluationPrompt(
            String questionText,
            String correctAnswer,
            String studentAnswer,
            Integer maxMarks) {

        return String.format("""
            You are an experienced teacher evaluating a student's answer.

            Question: %s

            Model Answer (correct answer): %s

            Student's Answer: %s

            Maximum Marks: %d

            Evaluate the student's answer and return ONLY a valid JSON object.
            No extra text before or after.

            {
              "suggestedMarks": <number between 0 and %d>,
              "feedback": "<detailed feedback for student>",
              "confidenceScore": <number between 0 and 100>,
              "keyPointsCovered": "<points student got right>",
              "keyPointsMissed": "<important points student missed>"
            }

            Rules:
            - Be fair and consistent
            - Give partial marks for partially correct answers
            - suggestedMarks must be between 0 and %d
            - feedback must be helpful and constructive
            - Return ONLY the JSON object
            """,
                questionText,
                correctAnswer,
                studentAnswer != null ? studentAnswer : "(No answer provided)",
                maxMarks,
                maxMarks,
                maxMarks
        );
    }

    private AiEvaluationResponse parseEvaluationResponse(
            String response, Integer maxMarks) {
        try {
            String cleanJson = response
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();

            JsonNode node = objectMapper.readTree(cleanJson);

            double suggestedMarks = node.path("suggestedMarks").asDouble(0);

            suggestedMarks = Math.min(suggestedMarks, maxMarks);
            suggestedMarks = Math.max(suggestedMarks, 0);

            return AiEvaluationResponse.builder()
                    .suggestedMarks(suggestedMarks)
                    .feedback(node.path("feedback").asText(""))
                    .confidenceScore(node.path("confidenceScore").asInt(0))
                    .keyPointsCovered(node.path("keyPointsCovered").asText(""))
                    .keyPointsMissed(node.path("keyPointsMissed").asText(""))
                    .build();

        } catch (Exception e) {
            log.error("Failed to parse AI evaluation response: {}",
                    e.getMessage());

            return AiEvaluationResponse.builder()
                    .suggestedMarks(0.0)
                    .feedback("AI evaluation failed. Please evaluate manually.")
                    .confidenceScore(0)
                    .build();
        }
    }
}