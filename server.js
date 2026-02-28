const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const cors = require("cors");
const fs = require("fs");


const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
const upload = multer({ dest: "uploads/" });

function generateQuiz(text) {

    // Remove extra spaces and line breaks
    text = text.replace(/\r?\n|\r/g, " ");
    text = text.replace(/\s+/g, " ");

    let quiz = [];

    // 🔥 STEP 1: Extract term-definition pairs (like "Speech Community - meaning")
    const termPattern = /([A-Za-z\s]+)\s*-\s*([^\.]+)/g;
    let match;

    while ((match = termPattern.exec(text)) !== null) {

        let term = match[1].trim();
        let definition = match[2].trim();

        if (term.length > 3 && definition.length > 10) {
            quiz.push({
                question: `What is ${term}?`,
                options: [
                    definition,
                    "An unrelated concept.",
                    "A communication barrier.",
                    "A language disorder."
                ],
                answer: 0
            });
        }
    }

    // 🔥 STEP 2: If not enough questions, use good sentences only
    if (quiz.length < 5) {

        let sentences = text
            .split(".")
            .map(s => s.trim())
            .filter(s =>
                s.length > 40 &&
                s.length < 180 &&
                !s.toLowerCase().includes("name of") &&
                !s.toLowerCase().includes("module") &&
                !s.toLowerCase().includes("course code")
            );

        for (let i = 0; i < sentences.length && quiz.length < 5; i++) {
            quiz.push({
                question: "Which statement is correct based on the lesson?",
                options: [
                    sentences[i],
                    "This statement contradicts the lesson.",
                    "This is unrelated to communication.",
                    "This is incorrect."
                ],
                answer: 0
            });
        }
    }

    return quiz.slice(0, 5);
}

app.post("/upload", upload.single("file"), async (req, res) => {
    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    let text = "";

    try {
        if (fileType.includes("pdf")) {
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            text = pdfData.text;
        } else if (
            fileType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } else {
            return res.status(400).json({ error: "Unsupported file type" });
        }

        const quiz = generateQuiz(text);

        fs.unlinkSync(filePath);

        res.json(quiz);

    } catch (error) {
        res.status(500).json({ error: "Error processing file" });
    }
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});