package com.examtopics.aiagent.service;

import com.examtopics.aiagent.model.AgentEvent;
import com.examtopics.aiagent.model.AgentTask;
import dev.langchain4j.service.AiServices;
import dev.langchain4j.service.spring.AiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.LocalDateTime;
import java.util.Map;

@Service
public class AgentService {
    
    private static final Logger logger = LoggerFactory.getLogger(AgentService.class);
    
    private final ChatModel chatModel;
    private final LangChainAgent langChainAgent;
    private final TaskExecutorService taskExecutorService;
    
    public AgentService(ChatModel chatModel, 
                       LangChainAgent langChainAgent,
                       TaskExecutorService taskExecutorService) {
        this.chatModel = chatModel;
        this.langChainAgent = langChainAgent;
        this.taskExecutorService = taskExecutorService;
    }
    
    public Mono<AgentEvent> handleEvent(AgentEvent event) {
        return Mono.fromCallable(() -> {
            logger.info("Handling event {} of type {}", event.getId(), event.getType());
            
            switch (event.getType()) {
                case "QUESTION_ANALYSIS":
                    return handleQuestionAnalysis(event);
                case "TEXT_PROCESSING":
                    return handleTextProcessing(event);
                case "KNOWLEDGE_EXTRACTION":
                    return handleKnowledgeExtraction(event);
                case "CONTENT_GENERATION":
                    return handleContentGeneration(event);
                default:
                    throw new IllegalArgumentException("Unknown event type: " + event.getType());
            }
        })
        .flatMap(Mono::just);
    }
    
    public Mono<AgentTask> executeTask(AgentTask task) {
        return Mono.fromCallable(() -> {
            logger.info("Executing task {} of type {}", task.getId(), task.getType());
            
            switch (task.getType()) {
                case "QUIZ_GENERATION":
                    return executeQuizGeneration(task);
                case "CONTENT_ANALYSIS":
                    return executeContentAnalysis(task);
                case "KNOWLEDGE_SYNTHESIS":
                    return executeKnowledgeSynthesis(task);
                case "LEARNING_PATH_CREATION":
                    return executeLearningPathCreation(task);
                default:
                    throw new IllegalArgumentException("Unknown task type: " + task.getType());
            }
        })
        .flatMap(result -> taskExecutorService.processTaskResult(task, result));
    }
    
    private AgentEvent handleQuestionAnalysis(AgentEvent event) {
        try {
            String analysis = langChainAgent.analyzeQuestion(event.getPayload());
            event.getMetadata().put("analysis_result", analysis);
            event.getMetadata().put("processed_by", "langchain_agent");
            return event;
        } catch (Exception e) {
            logger.error("Error analyzing question", e);
            throw new RuntimeException("Question analysis failed", e);
        }
    }
    
    private AgentEvent handleTextProcessing(AgentEvent event) {
        try {
            String processedText = langChainAgent.processText(event.getPayload());
            event.getMetadata().put("processed_text", processedText);
            event.getMetadata().put("processed_by", "langchain_agent");
            return event;
        } catch (Exception e) {
            logger.error("Error processing text", e);
            throw new RuntimeException("Text processing failed", e);
        }
    }
    
    private AgentEvent handleKnowledgeExtraction(AgentEvent event) {
        try {
            String knowledge = langChainAgent.extractKnowledge(event.getPayload());
            event.getMetadata().put("extracted_knowledge", knowledge);
            event.getMetadata().put("processed_by", "langchain_agent");
            return event;
        } catch (Exception e) {
            logger.error("Error extracting knowledge", e);
            throw new RuntimeException("Knowledge extraction failed", e);
        }
    }
    
    private AgentEvent handleContentGeneration(AgentEvent event) {
        try {
            UserMessage userMessage = new UserMessage(event.getPayload());
            Prompt prompt = new Prompt(userMessage);
            
            ChatResponse response = chatModel.call(prompt);
            String generatedContent = response.getResult().getOutput().getContent();
            
            event.getMetadata().put("generated_content", generatedContent);
            event.getMetadata().put("processed_by", "spring_ai");
            return event;
        } catch (Exception e) {
            logger.error("Error generating content", e);
            throw new RuntimeException("Content generation failed", e);
        }
    }
    
    private AgentTask executeQuizGeneration(AgentTask task) {
        try {
            String quiz = langChainAgent.generateQuiz(task.getInput());
            task.setOutput(quiz);
            task.setAssignedAgent("langchain_quiz_generator");
            return task;
        } catch (Exception e) {
            logger.error("Error generating quiz", e);
            throw new RuntimeException("Quiz generation failed", e);
        }
    }
    
    private AgentTask executeContentAnalysis(AgentTask task) {
        try {
            String analysis = langChainAgent.analyzeContent(task.getInput());
            task.setOutput(analysis);
            task.setAssignedAgent("langchain_content_analyzer");
            return task;
        } catch (Exception e) {
            logger.error("Error analyzing content", e);
            throw new RuntimeException("Content analysis failed", e);
        }
    }
    
    private AgentTask executeKnowledgeSynthesis(AgentTask task) {
        try {
            String synthesis = langChainAgent.synthesizeKnowledge(task.getInput());
            task.setOutput(synthesis);
            task.setAssignedAgent("langchain_knowledge_synthesizer");
            return task;
        } catch (Exception e) {
            logger.error("Error synthesizing knowledge", e);
            throw new RuntimeException("Knowledge synthesis failed", e);
        }
    }
    
    private AgentTask executeLearningPathCreation(AgentTask task) {
        try {
            UserMessage userMessage = new UserMessage("Create a learning path for: " + task.getInput());
            Prompt prompt = new Prompt(userMessage);
            
            ChatResponse response = chatModel.call(prompt);
            String learningPath = response.getResult().getOutput().getContent();
            
            task.setOutput(learningPath);
            task.setAssignedAgent("spring_ai_learning_creator");
            return task;
        } catch (Exception e) {
            logger.error("Error creating learning path", e);
            throw new RuntimeException("Learning path creation failed", e);
        }
    }
}

@AiService
interface LangChainAgent {
    
    String analyzeQuestion(String question);
    
    String processText(String text);
    
    String extractKnowledge(String content);
    
    String generateQuiz(String topic);
    
    String analyzeContent(String content);
    
    String synthesizeKnowledge(String knowledge);
}