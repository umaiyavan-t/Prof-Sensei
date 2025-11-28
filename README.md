# Prof. Sensei - Microlearning Assistant

A lightweight, AI-powered microlearning platform that transforms any topic into bite-sized lessons, flashcards, quizzes, and notes using Google's Gemini API.

## Features

- Lesson Mode: Concise bullet-point lessons
- Flashcard Mode: Interactive Q&A flashcards with review system
- Quiz Mode: Multiple-choice questions
- Notes Mode: Structured study notes
- Progress Dashboard: Track sessions and mastered cards
- Persistence: File-based storage (users.json, history.json)
- Export: Download chat history as .doc file
- Gamification: Mastered cards counter and progress tracking

## Architecture

- Backend: Pure Java (no frameworks) using `com.sun.net.httpserver`
- Frontend: Vanilla HTML/CSS/JavaScript
- AI: Google Gemini 2.0 Flash Exp API
- Storage: JSON files (in-memory with file persistence)

## Prerequisites

1. Java JDK 11+ - [Download here](https://www.oracle.com/java/technologies/downloads/)
2. Google Gemini API Key - [Get it here](https://makersuite.google.com/app/apikey)
3. Gson Library - For JSON parsing

## Setup Instructions

### Step 1: Download Dependencies

```bash
# Download Gson JAR
wget https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar

# Download Dotenv JAR
wget https://repo1.maven.org/maven2/io/github/cdimascio/dotenv-java/3.0.0/dotenv-java-3.0.0.jar
```

Or download manually from:
- Gson: https://github.com/google/gson/releases
- Dotenv: https://github.com/cdimascio/java-dotenv/releases

### Step 2: Project Structure

Create the following directory structure:

```
prof-sensei/
├── MicroLearnServer.java
├── gson-2.10.1.jar
├── web/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── users.json (created automatically)
└── history.json (created automatically)
```

### Step 3: Add Your API Key

Open `MicroLearnServer.java` and replace:

```java
private static final String GEMINI_API_KEY = "YOUR_API_KEY_HERE";
```

with your actual Gemini API key.

### Step 4: Compile and Run

```bash
# Compile (output class files to bin directory)
javac -cp .;gson-2.10.1.jar;dotenv-java.jar -d bin MicroLearnServer.java

# Run
java -cp bin;.;gson-2.10.1.jar;dotenv-java.jar MicroLearnServer

# On Linux/Mac, use colon instead:
java -cp bin:.:gson-2.10.1.jar:dotenv-java.jar MicroLearnServer
```

### Step 5: Access the App

Open your browser and navigate to:
```
http://localhost:8080/index.html
```

## Usage Guide

### 1. Register/Login
- Create a new account with name, username, and password
- Login with your credentials

### 2. Choose a Learning Mode
- Click on any mode button (Lesson/Flashcards/Quiz/Notes)

### 3. Enter a Topic
- Type any topic in the input field (e.g., "Photosynthesis", "Python loops")
- Click "Generate" or press Enter

### 4. Review Content
- Read the AI-generated content
- For flashcards, click "Review Cards" to start interactive review

### 5. Track Progress
- Click "Dashboard" to see your stats
- View total sessions and mastered cards

### 6. Export Content
- Click "Export (.docx)" to download your learning session

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/register` | POST | Create new user |
| `/api/login` | POST | User login |
| `/api/chat` | POST | Generate AI content |
| `/api/history` | GET | Get chat history |
| `/api/progress` | GET/POST | Get/update progress |
| `/api/flashcard-review` | POST | Mark cards as mastered |

## Troubleshooting

### Server won't start
- Make sure port 8080 is not in use
- Check Java version: `java -version` (should be 11+)
- Verify Gson JAR is in the same directory

### API not working
- Verify your Gemini API key is correct
- Check your internet connection
- Ensure the API key has not exceeded quota

### Files not loading
- Make sure `web/` directory exists with all files
- Check file permissions
- Verify file paths in browser console (F12)

## Configuration

### Change Port
Edit in `MicroLearnServer.java`:
```java
private static final int PORT = 8080; // Change to your preferred port
```

### Change Gemini Model
Edit in `MicroLearnServer.java`:
```java
private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=" + GEMINI_API_KEY;
```

Available models:
- `gemini-2.0-flash-exp` (Fast & Free)
- `gemini-1.5-flash` (Stable)
- `gemini-1.5-pro` (Most capable)

## Data Storage

- `users.json`: Stores user accounts and progress
- `history.json`: Stores all chat messages per user
- Both files are automatically created and updated

## Customization

### Change Theme Colors
Edit in `web/styles.css`:
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

### Modify Prompts
Edit in `MicroLearnServer.java`, method `buildPrompt()`:
```java
case "lesson":
    return "Your custom prompt here";
```

## Future Enhancements

- PDF export support
- Spaced repetition algorithm
- Multi-language support
- Voice narration
- Collaborative learning
- Topic suggestions
- Learning streaks

## License

MIT License - Free for personal and commercial use

## Contributing

Contributions welcome:
- Report bugs
- Suggest features
- Submit pull requests

## Tips

1. Be specific with topics: "Photosynthesis in C3 plants" works better than just "plants"
2. Use flashcards for memorization: Great for vocabulary, formulas, dates
3. Export regularly: Save your learning sessions for offline review
4. Track progress: Use the dashboard to stay motivated

## Support

For issues or questions:
- Check the troubleshooting section
- Review Gemini API documentation
- Check browser console for errors (F12)

---

Made with care for learners everywhere

Happy learning.