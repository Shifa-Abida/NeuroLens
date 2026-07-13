# NeuroLens

## 📖 Project Overview
NeuroLens is a **real‑time video‑analysis platform** that uses a webcam to capture video, detects faces, extracts facial embeddings, and provides AI‑generated summaries of the captured content. The system combines a modern **React/Next.js** front‑end with a **Spring Boot** back‑end, stores user data in **MongoDB**, and communicates via **WebSocket** for low‑latency updates.

---

## 🛠️ Tech Stack
The full tech‑stack is documented in **[TECH_STACK.md](TECH_STACK.md)**, but the core components are:

- **Frontend**: React.js, Next.js
- **Styling**: Tailwind CSS
- **Webcam / Media**: WebRTC & Browser Camera API
- **Face Detection**: MediaPipe, face‑api.js
- **Face Recognition**: face‑api.js embeddings
- **Backend**: Spring Boot (Java)
- **Database**: MongoDB
- **Real‑time Updates**: WebSocket
- **Speech‑to‑Text**: Web Speech API
- **AI Summary**: OpenAI API / Gemini API
- **API Testing**: Postman
- **Version Control**: Git + GitHub

---

## 🚀 Getting Started
### Prerequisites
- **Node.js** (v20 or later) and **npm** (or pnpm) installed
- **Java 21** and **Maven** installed
- **MongoDB** instance running locally or remotely
- An **OpenAI** or **Gemini** API key (set in environment variables)

### Clone the repository
```bash
git clone https://github.com/<your‑username>/NeuroLens.git
cd NeuroLens   # adjust path if needed
```

### Front‑end setup (ar‑interface & caregiver‑portal)
Both front‑end apps are located in `ar-interface` and `caregiver-portal`.
```bash
# Install dependencies (using pnpm – you can also use npm)
pnpm install
# Run the dev server
pnpm dev   # starts Next.js on http://localhost:3000
```

### Back‑end setup (Spring Boot)
```bash
# From the root of the Java project
./mvnw clean install   # builds the project
./mvnw spring-boot:run # starts the API on http://localhost:8080
```

### Environment variables
Create a `.env` (or `.env.local` for Next.js) with the following keys:
```
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
MONGODB_URI=mongodb://localhost:27017/neurolens
SPRING_MONGODB_URI=mongodb://localhost:27017/neurodb
```
Do **not** commit this file; it is listed in `.gitignore`.

---

## 📹 Usage
1. Open the **AR Interface** (`http://localhost:3000`) in a browser that supports WebRTC.
2. Grant camera permissions.
3. The app streams video, detects faces, and shows real‑time bounding boxes.
4. Detected face embeddings are sent to the back‑end, stored in MongoDB, and can be queried for recognition.
5. Speech captured via the Web Speech API is transcribed and fed to the AI summarizer, which returns a concise text summary displayed to the user.

---

## 🧪 Testing
- **API testing**: Import the provided Postman collection (`postman_collection.json` placed in the repo) and run the predefined requests.
- **Front‑end**: Use the built‑in `npm run lint` and `npm run test` scripts (if tests are added later).

---

## 🤝 Contributing
We welcome contributions! Please:
1. Fork the repository.
2. Create a feature branch (`git checkout -b feat/your‑feature`).
3. Commit your changes with clear messages.
4. Open a Pull Request targeting `main`.

Remember to keep any secret keys out of the repository and update `.gitignore` if you add new secret‑type files.

---

## 📄 License
This project is licensed under the **MIT License** – see the `LICENSE` file for details.

---

*Happy coding!*
