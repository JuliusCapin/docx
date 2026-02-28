app.post("/upload", upload.single("file"), async (req, res) => {

    console.log("FILE OBJECT:", req.file);

    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;

    console.log("MIME TYPE:", fileType);

    let text = "";

    try {

        if (fileType.includes("pdf")) {
            console.log("Reading PDF...");
            const dataBuffer = fs.readFileSync(filePath);
            const pdfData = await pdfParse(dataBuffer);
            text = pdfData.text;
        } 
        else if (fileType.includes("wordprocessingml")) {
            console.log("Reading DOCX...");
            const result = await mammoth.extractRawText({ path: filePath });
            text = result.value;
        } 
        else {
            return res.status(400).json({ error: "Unsupported file type" });
        }

        console.log("Extracted text length:", text.length);

        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: "No text extracted from file" });
        }

        const quiz = generateQuiz(text);

        fs.unlinkSync(filePath);

        return res.json(quiz);

    } catch (error) {
        console.error("REAL ERROR:", error);
        return res.status(500).json({ error: error.message });
    }
});