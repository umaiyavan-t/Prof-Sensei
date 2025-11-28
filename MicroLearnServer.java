import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import com.google.gson.*;
import io.github.cdimascio.dotenv.Dotenv;

public class MicroLearnServer {
    private static final int PORT = 8080;
    private static final Dotenv dotenv = Dotenv.load();
    private static final String GEMINI_API_KEY = dotenv.get("GEMINI_API_KEY");
    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY;
    
    private static Map<String, User> users = new ConcurrentHashMap<>();
    private static Map<String, List<ChatMessage>> chatHistory = new ConcurrentHashMap<>();
    private static Gson gson = new GsonBuilder().setPrettyPrinting().create();
    
    private static final String USERS_FILE = "users.json";
    private static final String HISTORY_FILE = "history.json";
    
    public static void main(String[] args) throws IOException {
        loadData();
        
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        
        // API endpoints
        server.createContext("/api/register", new RegisterHandler());
        server.createContext("/api/login", new LoginHandler());
        server.createContext("/api/chat", new ChatHandler());
        server.createContext("/api/history", new HistoryHandler());
        server.createContext("/api/progress", new ProgressHandler());
        server.createContext("/api/flashcard-review", new FlashcardReviewHandler());
        
        // Static files
        server.createContext("/", new StaticHandler());
        
        server.setExecutor(Executors.newFixedThreadPool(10));
        server.start();
        
        System.out.println("Server running on http://localhost:" + PORT);
        System.out.println("Access the app at http://localhost:" + PORT + "/index.html");
    }
    
    // Data persistence
    static void loadData() {
        try {
            if (Files.exists(Paths.get(USERS_FILE))) {
                String json = Files.readString(Paths.get(USERS_FILE));
                User[] userArray = gson.fromJson(json, User[].class);
                for (User u : userArray) {
                    users.put(u.id, u);
                }
            }
            if (Files.exists(Paths.get(HISTORY_FILE))) {
                String json = Files.readString(Paths.get(HISTORY_FILE));
                java.lang.reflect.Type type = new com.google.gson.reflect.TypeToken<Map<String, List<ChatMessage>>>(){}.getType();
                chatHistory = gson.fromJson(json, type);
            }
        } catch (Exception e) {
            System.out.println("No previous data found, starting fresh.");
        }
    }
    
    static void saveData() {
        try {
            Files.writeString(Paths.get(USERS_FILE), gson.toJson(users.values()));
            Files.writeString(Paths.get(HISTORY_FILE), gson.toJson(chatHistory));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
    
    // Models
    static class User {
        String id;
        String name;
        String username;
        String password;
        int totalSessions;
        int masteredCards;
        long createdAt;
        
        User(String name, String username, String password) {
            this.id = "u" + System.currentTimeMillis();
            this.name = name;
            this.username = username;
            this.password = password;
            this.totalSessions = 0;
            this.masteredCards = 0;
            this.createdAt = System.currentTimeMillis();
        }
    }
    
    static class ChatMessage {
        String role;
        String content;
        String mode;
        String topic;
        long timestamp;
        
        ChatMessage(String role, String content, String mode, String topic) {
            this.role = role;
            this.content = content;
            this.mode = mode;
            this.topic = topic;
            this.timestamp = System.currentTimeMillis();
        }
    }
    
    // Handlers
    static class RegisterHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("POST".equals(ex.getRequestMethod())) {
                String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                JsonObject req = gson.fromJson(body, JsonObject.class);
                
                String name = req.get("name").getAsString();
                String username = req.get("username").getAsString();
                String password = req.get("password").getAsString();
                
                // Check if username exists
                for (User u : users.values()) {
                    if (u.username.equals(username)) {
                        sendResponse(ex, 400, "{\"error\":\"Username already exists\"}");
                        return;
                    }
                }
                
                User user = new User(name, username, password);
                users.put(user.id, user);
                chatHistory.put(user.id, new ArrayList<>());
                saveData();
                
                sendResponse(ex, 200, gson.toJson(user));
            }
        }
    }
    
    static class LoginHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("POST".equals(ex.getRequestMethod())) {
                String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                JsonObject req = gson.fromJson(body, JsonObject.class);
                
                String username = req.get("username").getAsString();
                String password = req.get("password").getAsString();
                
                for (User u : users.values()) {
                    if (u.username.equals(username) && u.password.equals(password)) {
                        sendResponse(ex, 200, gson.toJson(u));
                        return;
                    }
                }
                
                sendResponse(ex, 401, "{\"error\":\"Invalid credentials\"}");
            }
        }
    }
    
    static class ChatHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("POST".equals(ex.getRequestMethod())) {
                String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                JsonObject req = gson.fromJson(body, JsonObject.class);
                
                String userId = req.get("userId").getAsString();
                String topic = req.get("topic").getAsString();
                String mode = req.get("mode").getAsString();
                
                String prompt = buildPrompt(topic, mode);
                String response = callGeminiAPI(prompt);
                
                ChatMessage msg = new ChatMessage("assistant", response, mode, topic);
                chatHistory.computeIfAbsent(userId, k -> new ArrayList<>()).add(msg);
                
                User user = users.get(userId);
                user.totalSessions++;
                
                saveData();
                
                sendResponse(ex, 200, gson.toJson(msg));
            }
        }
        
        String buildPrompt(String topic, String mode) {
            switch (mode) {
                case "lesson":
                    return "Create a concise microlearning lesson about: " + topic + 
                           ". Use bullet points, keep it under 200 words, focus on key concepts.";
                case "flashcards":
                    return "Generate 5 flashcard Q&A pairs about: " + topic + 
                           ". Format: Q: [question]\nA: [answer]\n\n for each card.";
                case "quiz":
                    return "Create 5 multiple-choice quiz questions about: " + topic + 
                           ". Format each as:\nQ: [question]\nA) [option]\nB) [option]\nC) [option]\nD) [option]\nCorrect: [letter]\n\n";
                case "notes":
                    return "Generate structured study notes about: " + topic + 
                           ". Include: Definition, Key Points (3-5), Examples, Summary. Keep concise.";
                default:
                    return "Explain: " + topic;
            }
        }
        
        String callGeminiAPI(String prompt) {
            try {
                URL url = new URL(GEMINI_URL);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                
                JsonObject requestBody = new JsonObject();
                JsonArray contents = new JsonArray();
                JsonObject content = new JsonObject();
                JsonArray parts = new JsonArray();
                JsonObject part = new JsonObject();
                part.addProperty("text", prompt);
                parts.add(part);
                content.add("parts", parts);
                contents.add(content);
                requestBody.add("contents", contents);
                
                try (OutputStream os = conn.getOutputStream()) {
                    os.write(requestBody.toString().getBytes(StandardCharsets.UTF_8));
                }
                
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream()));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line);
                }
                br.close();
                
                JsonObject responseObj = gson.fromJson(response.toString(), JsonObject.class);
                return responseObj.getAsJsonArray("candidates")
                    .get(0).getAsJsonObject()
                    .getAsJsonObject("content")
                    .getAsJsonArray("parts")
                    .get(0).getAsJsonObject()
                    .get("text").getAsString();
                    
            } catch (Exception e) {
                e.printStackTrace();
                return "Error generating content. Please check your API key and try again.";
            }
        }
    }
    
    static class HistoryHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("GET".equals(ex.getRequestMethod())) {
                String query = ex.getRequestURI().getQuery();
                String userId = query.split("=")[1];
                
                List<ChatMessage> history = chatHistory.getOrDefault(userId, new ArrayList<>());
                sendResponse(ex, 200, gson.toJson(history));
            }
        }
    }
    
    static class ProgressHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("GET".equals(ex.getRequestMethod())) {
                String query = ex.getRequestURI().getQuery();
                String userId = query.split("=")[1];
                
                User user = users.get(userId);
                sendResponse(ex, 200, gson.toJson(user));
            } else if ("POST".equals(ex.getRequestMethod())) {
                String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                JsonObject req = gson.fromJson(body, JsonObject.class);
                
                String userId = req.get("userId").getAsString();
                int masteredCards = req.get("masteredCards").getAsInt();
                
                User user = users.get(userId);
                user.masteredCards = masteredCards;
                saveData();
                
                sendResponse(ex, 200, gson.toJson(user));
            }
        }
    }
    
    static class FlashcardReviewHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            if ("POST".equals(ex.getRequestMethod())) {
                String body = new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                JsonObject req = gson.fromJson(body, JsonObject.class);
                
                String userId = req.get("userId").getAsString();
                int cardsReviewed = req.get("cardsReviewed").getAsInt();
                
                User user = users.get(userId);
                user.masteredCards += cardsReviewed;
                saveData();
                
                sendResponse(ex, 200, "{\"success\":true}");
            }
        }
    }
    
    static class StaticHandler implements HttpHandler {
        public void handle(HttpExchange ex) throws IOException {
            String path = ex.getRequestURI().getPath();
            if (path.equals("/")) path = "/index.html";
            
            File file = new File("web" + path);
            if (file.exists() && !file.isDirectory()) {
                String contentType = getContentType(path);
                ex.getResponseHeaders().set("Content-Type", contentType);
                ex.sendResponseHeaders(200, file.length());
                Files.copy(file.toPath(), ex.getResponseBody());
                ex.getResponseBody().close();
            } else {
                String response = "404 Not Found";
                ex.sendResponseHeaders(404, response.length());
                ex.getResponseBody().write(response.getBytes());
                ex.getResponseBody().close();
            }
        }
        
        String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".js")) return "application/javascript";
            if (path.endsWith(".json")) return "application/json";
            return "text/plain";
        }
    }
    
    static void sendResponse(HttpExchange ex, int status, String response) throws IOException {
        ex.getResponseHeaders().set("Content-Type", "application/json");
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        ex.sendResponseHeaders(status, response.getBytes().length);
        OutputStream os = ex.getResponseBody();
        os.write(response.getBytes());
        os.close();
    }
}