package io.pariksha.service.impl;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts.FontName;
import org.springframework.stereotype.Service;

import io.pariksha.entity.PaperQuestion;
import io.pariksha.entity.Question;
import io.pariksha.entity.QuestionPaper;
import io.pariksha.entity.Student;
import io.pariksha.entity.Teacher;
import io.pariksha.entity.User;
import io.pariksha.enums.QuestionType;
import io.pariksha.enums.Role;
import io.pariksha.exceptions.ResourceNotFoundException;
import io.pariksha.exceptions.UnauthorizedException;
import io.pariksha.repository.PaperQuestionRepository;
import io.pariksha.repository.QuestionPaperRepository;
import io.pariksha.repository.StudentRepository;
import io.pariksha.repository.TeacherRepository;
import io.pariksha.repository.UserRepository;
import io.pariksha.service.PdfService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PdfServiceImpl implements PdfService {

    private final QuestionPaperRepository paperRepository;
    private final PaperQuestionRepository paperQuestionRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

    // ── Color Palette ──
    private static final float[] COLOR_HEADER_BG  = {0.09f, 0.18f, 0.35f};
    private static final float[] COLOR_SECTION_BG = {0.07f, 0.62f, 0.62f};
    private static final float[] COLOR_DETAILS_BG = {0.91f, 0.95f, 1.0f};
    private static final float[] COLOR_ACCENT     = {0.85f, 0.65f, 0.13f};
    private static final float[] COLOR_ANSWER_BG  = {0.07f, 0.40f, 0.25f};
    private static final float[] COLOR_ANSWER_ROW = {0.90f, 0.97f, 0.93f};
    private static final float[] COLOR_RED        = {0.78f, 0.11f, 0.11f};
    private static final float[] COLOR_WHITE      = {1.0f,  1.0f,  1.0f};
    private static final float[] COLOR_DARK       = {0.13f, 0.13f, 0.13f};
    private static final float[] COLOR_LIGHT_GRAY = {0.95f, 0.95f, 0.97f};
    private static final float[] COLOR_GRAY_TEXT  = {0.50f, 0.50f, 0.50f};
    private static final float[] COLOR_BLUE_LABEL = {0.30f, 0.45f, 0.65f};

    // Page constants
    private static final float PAGE_WIDTH    = PDRectangle.A4.getWidth();
    private static final float PAGE_HEIGHT   = PDRectangle.A4.getHeight();
    private static final float MARGIN        = 45f;
    private static final float CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

    // ────────────────────────────────────────
    //   FONT LOADER — PDFBox 3.x way
    // ────────────────────────────────────────

    // In PDFBox 3.x use PDType1Font(FontName) constructor
    private PDType1Font getBold(PDDocument doc) {
        return new PDType1Font(FontName.HELVETICA_BOLD);
    }

    private PDType1Font getRegular(PDDocument doc) {
        return new PDType1Font(FontName.HELVETICA);
    }

    private PDType1Font getItalic(PDDocument doc) {
        return new PDType1Font(FontName.HELVETICA_OBLIQUE);
    }

    private PDType1Font getBoldItalic(PDDocument doc) {
        return new PDType1Font(FontName.HELVETICA_BOLD_OBLIQUE);
    }

    // ────────────────────────────────────────
    //   TEACHER PDF
    // ────────────────────────────────────────

    @Override
    public byte[] generateTeacherPdf(Long paperId, Long teacherUserId) {

        User teacherUser = userRepository.findById(teacherUserId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Teacher", "id", teacherUserId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        if (!paper.getCreatedBy().getId().equals(teacherUserId)) {
            throw new UnauthorizedException(
                    "You can only download your own papers.");
        }

        Teacher teacher = teacherRepository.findByUser(teacherUser)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "TeacherProfile", "userId", teacherUserId));

        List<PaperQuestion> questions =
                paperQuestionRepository
                        .findByQuestionPaperOrderByQuestionOrderAsc(paper);

        return buildPdf(paper, questions, teacher, true);
    }

    // ────────────────────────────────────────
    //   STUDENT PDF
    // ────────────────────────────────────────

    @Override
    public byte[] generateStudentPdf(Long paperId, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "User", "id", userId));

        QuestionPaper paper = paperRepository.findById(paperId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "QuestionPaper", "id", paperId));

        // If logged in user is a STUDENT, validate class
        if (user.getRole() == Role.ROLE_STUDENT) {

            Student student = studentRepository.findByUser(user)
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "StudentProfile", "userId", userId));

            if (paper.getClassRoom() != null) {

                boolean sameClass =
                        paper.getClassRoom().getClassName()
                                .equals(student.getClassName())
                        &&
                        paper.getClassRoom().getSection()
                                .equals(student.getSection());

                if (!sameClass) {
                    throw new UnauthorizedException(
                            "This paper is not assigned to your class.");
                }
            }
        }

        // Teacher skips the class validation

        List<PaperQuestion> questions =
                paperQuestionRepository
                        .findByQuestionPaperOrderByQuestionOrderAsc(paper);

        return buildPdf(paper, questions, null, false);
    }

    // ────────────────────────────────────────
    //   CORE PDF BUILDER
    // ────────────────────────────────────────

    private byte[] buildPdf(QuestionPaper paper,
            List<PaperQuestion> questions,
            Teacher teacher, boolean includeAnswerKey) {

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            // ── Fonts — PDFBox 3.x way ──
            PDType1Font bold       = getBold(document);
            PDType1Font regular    = getRegular(document);
            PDType1Font italic     = getItalic(document);
            PDType1Font boldItalic = getBoldItalic(document);

            float[] yPos = {PAGE_HEIGHT - MARGIN};

            // ── First Page ──
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            PDPageContentStream cs = new PDPageContentStream(
                    document, page,
                    PDPageContentStream.AppendMode.OVERWRITE, true);

            // Draw page outer border
            drawPageBorder(cs);

            // Draw header
            yPos[0] = drawHeader(cs, paper, bold, italic, yPos[0]);

            // Draw details row
            yPos[0] = drawDetailsRow(cs, paper, bold, regular, yPos[0]);

            // Draw instructions if present
            if (paper.getInstructions() != null &&
                    !paper.getInstructions().isBlank()) {
                yPos[0] = drawInstructions(
                        cs, paper.getInstructions(),
                        bold, italic, yPos[0]);
            }

            // Draw questions section title bar
            yPos[0] = drawSectionTitle(cs, "QUESTIONS", bold, yPos[0]);

            cs.close();

            // ── Draw Questions (may span pages) ──
            PDPage[] currentPage = {page};

            PDPageContentStream[] currentCs = {
                new PDPageContentStream(
                    document, currentPage[0],
                    PDPageContentStream.AppendMode.APPEND, true)
            };

            for (PaperQuestion pq : questions) {

                // Estimate space needed for this question
                int estimatedLines = 3 + (
                    pq.getQuestion().getQuestionType() == QuestionType.LONG_ANSWER
                        ? 8 : 4);
                float spaceNeeded = estimatedLines * 16f;

                if (yPos[0] - spaceNeeded < 60f) {
                    currentCs[0].close();

                    PDPage newPage = new PDPage(PDRectangle.A4);
                    document.addPage(newPage);
                    currentPage[0] = newPage;

                    currentCs[0] = new PDPageContentStream(
                            document, newPage,
                            PDPageContentStream.AppendMode.OVERWRITE, true);

                    drawPageBorder(currentCs[0]);
                    yPos[0] = PAGE_HEIGHT - MARGIN;
                }

                yPos[0] = drawQuestion(
                        currentCs[0], pq,
                        regular, bold, italic,
                        yPos[0]);
            }

            currentCs[0].close();

            // ── Answer Key Page (teacher only) ──
            if (includeAnswerKey && !questions.isEmpty()) {
                PDPage answerPage = new PDPage(PDRectangle.A4);
                document.addPage(answerPage);

                PDPageContentStream acs = new PDPageContentStream(
                        document, answerPage,
                        PDPageContentStream.AppendMode.OVERWRITE, true);

                drawPageBorder(acs);
                drawAnswerKey(acs, questions, bold, regular, italic);
                acs.close();
            }

            // ── Page Numbers (all pages) ──
            addPageNumbers(document, bold, italic);

            document.save(out);
            log.info("PDF generated successfully for paper: {}",
                    paper.getTitle());
            return out.toByteArray();

        } catch (IOException e) {
            log.error("PDF generation failed: {}", e.getMessage(), e);
            throw new RuntimeException(
                    "Failed to generate PDF. Please try again.");
        }
    }

    // ────────────────────────────────────────
    //   DRAW HEADER
    // ────────────────────────────────────────

    private float drawHeader(PDPageContentStream cs,
            QuestionPaper paper,
            PDType1Font bold, PDType1Font italic,
            float y) throws IOException {

        float headerHeight = 100f;
        float headerTop    = y;
        float headerBottom = y - headerHeight;

        // ── Main navy background ──
        fillRect(cs, 0f, headerBottom, PAGE_WIDTH, headerHeight,
                COLOR_HEADER_BG);

        // ── Gold top stripe ──
        fillRect(cs, 0f, headerTop - 5f, PAGE_WIDTH, 5f, COLOR_ACCENT);

        // ── School name ──
        drawTextCentered(cs, "PARIKSHA.IO",
                bold, 24f, COLOR_WHITE, headerTop - 34f);

        // ── Tagline ──
        drawTextCentered(cs, "Excellence in Education — Smart Exam Management",
                italic, 9f,
                new float[]{0.82f, 0.82f, 0.82f},
                headerTop - 50f);

        // ── Gold divider inside header ──
        setStrokeColor(cs, COLOR_ACCENT);
        cs.setLineWidth(1.0f);
        cs.moveTo(MARGIN + 20f, headerTop - 58f);
        cs.lineTo(PAGE_WIDTH - MARGIN - 20f, headerTop - 58f);
        cs.stroke();

        // ── Paper title ──
        String title = sanitizeText(paper.getTitle().toUpperCase());
        drawTextCentered(cs, title, bold, 13f,
                COLOR_WHITE, headerTop - 78f);

        // ── Generated date — bottom right ──
        String dateStr = "Generated: " +
                LocalDateTime.now().format(
                    DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a"));
        float dateX = PAGE_WIDTH - MARGIN
                - getTextWidth(dateStr, italic, 7.5f);
        drawText(cs, dateStr, italic, 7.5f,
                new float[]{0.72f, 0.72f, 0.72f},
                dateX, headerBottom + 8f);

        // ── Gold bottom stripe ──
        fillRect(cs, 0f, headerBottom, PAGE_WIDTH, 4f, COLOR_ACCENT);

        return headerBottom - 10f;
    }

    // ────────────────────────────────────────
    //   DRAW DETAILS ROW
    // ────────────────────────────────────────

    private float drawDetailsRow(PDPageContentStream cs,
            QuestionPaper paper,
            PDType1Font bold, PDType1Font regular,
            float y) throws IOException {

        float rowH = 52f;
        float rowY = y - rowH;

        // ── Light blue background ──
        fillRect(cs, MARGIN, rowY, CONTENT_WIDTH, rowH,
                COLOR_DETAILS_BG);

        // ── Border ──
        setStrokeColor(cs, new float[]{0.70f, 0.82f, 0.95f});
        cs.setLineWidth(1.2f);
        cs.addRect(MARGIN, rowY, CONTENT_WIDTH, rowH);
        cs.stroke();

        float colW   = CONTENT_WIDTH / 4f;
        float labelY = y - 18f;
        float valueY = y - 38f;

        // Col 1 — Subject
        drawDetailCell(cs, "SUBJECT",
                sanitizeText(paper.getSubject()),
                bold, regular,
                MARGIN + 10f, labelY, valueY);

        drawVerticalDivider(cs, MARGIN + colW,
                rowY + 8f, rowH - 16f);

        // Col 2 — Class
        String classInfo = paper.getClassLevel() +
                (paper.getClassRoom() != null
                    ? "  |  Sec " + paper.getClassRoom().getSection()
                    : "");
        drawDetailCell(cs, "CLASS",
                sanitizeText(classInfo),
                bold, regular,
                MARGIN + colW + 10f, labelY, valueY);

        drawVerticalDivider(cs, MARGIN + colW * 2f,
                rowY + 8f, rowH - 16f);

        // Col 3 — Total Marks
        drawDetailCell(cs, "TOTAL MARKS",
                String.valueOf(paper.getTotalMarks()),
                bold, regular,
                MARGIN + colW * 2f + 10f, labelY, valueY);

        drawVerticalDivider(cs, MARGIN + colW * 3f,
                rowY + 8f, rowH - 16f);

        // Col 4 — Duration
        drawDetailCell(cs, "DURATION",
                paper.getDurationMinutes() + " Min",
                bold, regular,
                MARGIN + colW * 3f + 10f, labelY, valueY);

        return rowY - 12f;
    }

    // ────────────────────────────────────────
    //   DRAW INSTRUCTIONS
    // ────────────────────────────────────────

    private float drawInstructions(PDPageContentStream cs,
            String instructions,
            PDType1Font bold, PDType1Font italic,
            float y) throws IOException {

        float startY   = y - 8f;
        float titleH   = 22f;
        float contentH = 46f;
        float totalH   = titleH + contentH;

        // ── Amber title bar ──
        fillRect(cs, MARGIN, startY - titleH,
                CONTENT_WIDTH, titleH,
                new float[]{0.94f, 0.73f, 0.18f});

        // ── Pencil icon text + label ──
        drawText(cs, "✎  GENERAL INSTRUCTIONS",
                bold, 9f, COLOR_DARK,
                MARGIN + 10f, startY - 15f);

        // ── Light amber content area ──
        fillRect(cs, MARGIN, startY - totalH,
                CONTENT_WIDTH, contentH,
                new float[]{1.0f, 0.97f, 0.90f});

        // ── Amber border ──
        setStrokeColor(cs, new float[]{0.94f, 0.73f, 0.18f});
        cs.setLineWidth(1.0f);
        cs.addRect(MARGIN, startY - totalH, CONTENT_WIDTH, totalH);
        cs.stroke();

        // ── Instructions text ──
        String[] lines = wrapText(instructions, italic, 8.5f,
                CONTENT_WIDTH - 24f);
        float lineY = startY - titleH - 14f;
        for (String line : lines) {
            if (lineY < startY - totalH + 6f) break;
            drawText(cs, line, italic, 8.5f,
                    new float[]{0.25f, 0.20f, 0.10f},
                    MARGIN + 12f, lineY);
            lineY -= 14f;
        }

        return startY - totalH - 10f;
    }

    // ────────────────────────────────────────
    //   DRAW SECTION TITLE BAR
    // ────────────────────────────────────────

    private float drawSectionTitle(PDPageContentStream cs,
            String title, PDType1Font bold, float y)
            throws IOException {

        float barH = 26f;
        float barY = y - barH - 5f;

        // ── Teal background ──
        fillRect(cs, MARGIN, barY, CONTENT_WIDTH, barH,
                COLOR_SECTION_BG);

        // ── Gold left accent ──
        fillRect(cs, MARGIN, barY, 5f, barH, COLOR_ACCENT);

        // ── Title text ──
        drawText(cs, "   " + title,
                bold, 10.5f, COLOR_WHITE,
                MARGIN + 10f, barY + 9f);

        return barY - 10f;
    }

    // ────────────────────────────────────────
    //   DRAW SINGLE QUESTION
    // ────────────────────────────────────────

    private float drawQuestion(PDPageContentStream cs,
            PaperQuestion pq,
            PDType1Font regular, PDType1Font bold, PDType1Font italic,
            float y) throws IOException {

        Question q   = pq.getQuestion();
        int qNum     = pq.getQuestionOrder();
        boolean even = qNum % 2 == 0;

        // ── Zebra background ──
        float bgH = estimateQuestionHeight(q);
        fillRect(cs, MARGIN, y - bgH,
                CONTENT_WIDTH, bgH,
                even ? COLOR_LIGHT_GRAY
                     : new float[]{1.0f, 1.0f, 1.0f});

        float badgeY = y - 22f;

        // ── Question number badge (navy) ──
        fillRoundRect(cs, MARGIN + 2f, badgeY, 26f, 18f,
                COLOR_HEADER_BG);
        String numStr = String.valueOf(qNum);
        drawText(cs, numStr, bold, 9f, COLOR_WHITE,
                MARGIN + 2f + (qNum < 10 ? 9f : 5f), badgeY + 5f);

        // ── Question type tag (teal) ──
        String typeTag = formatQuestionType(q.getQuestionType());
        float tagW = getTextWidth(typeTag, italic, 7.5f) + 10f;
        float tagX = MARGIN + 33f;
        fillRoundRect(cs, tagX, badgeY + 2f, tagW, 14f,
                COLOR_SECTION_BG);
        drawText(cs, typeTag, italic, 7.5f,
                COLOR_WHITE, tagX + 5f, badgeY + 6f);

        // ── Marks badge (gold, right aligned) ──
        String mText = q.getMarks() + (q.getMarks() == 1 ? " Mk" : " Mks");
        float mW  = getTextWidth(mText, bold, 8.5f) + 12f;
        float mX  = PAGE_WIDTH - MARGIN - mW - 2f;
        fillRoundRect(cs, mX, badgeY, mW, 18f, COLOR_ACCENT);
        drawText(cs, mText, bold, 8.5f,
                COLOR_WHITE, mX + 6f, badgeY + 5f);

        // ── Question text ──
        float qTextX = MARGIN + 8f;
        float qTextW = CONTENT_WIDTH - 16f;
        String[] qLines = wrapText(
                sanitizeText(q.getQuestionText()),
                regular, 10f, qTextW);

        float textY = y - 20f;
        for (String line : qLines) {
            drawText(cs, line, regular, 10f,
                    COLOR_DARK, qTextX, textY);
            textY -= 15f;
        }

        float curY = textY - 4f;

        // ── Question type specific content ──
        switch (q.getQuestionType()) {
            case MCQ ->
                curY = drawMcqOptions(cs, q.getOptions(),
                        regular, bold, curY);
            case TRUE_FALSE ->
                curY = drawTrueFalseOptions(cs, curY);
            case SHORT_ANSWER ->
                curY = drawAnswerLines(cs, italic, curY, 3);
            case LONG_ANSWER ->
                curY = drawAnswerLines(cs, italic, curY, 7);
            case FILL_IN_THE_BLANK ->
                curY = drawFillBlankHint(cs, italic, curY);
        }

        // ── Bottom divider ──
        setStrokeColor(cs, new float[]{0.82f, 0.82f, 0.88f});
        cs.setLineWidth(0.5f);
        cs.moveTo(MARGIN, curY - 6f);
        cs.lineTo(PAGE_WIDTH - MARGIN, curY - 6f);
        cs.stroke();

        return curY - 14f;
    }

    // ────────────────────────────────────────
    //   MCQ OPTIONS
    // ────────────────────────────────────────

    private float drawMcqOptions(PDPageContentStream cs,
            String optionsJson,
            PDType1Font regular, PDType1Font bold,
            float y) throws IOException {

        if (optionsJson == null || optionsJson.isBlank())
            return y;

        // Parse: ["Option A","Option B","Option C","Option D"]
        String cleaned = optionsJson
                .replace("[", "").replace("]", "")
                .replace("\"", "").trim();
        String[] opts  = cleaned.split(",");

        char[]  labels  = {'A', 'B', 'C', 'D'};
        float   optX    = MARGIN + 30f;
        float   colW    = (CONTENT_WIDTH - 35f) / 2f;
        float   curY    = y - 4f;

        for (int i = 0; i < opts.length && i < 4; i++) {
            String optText = sanitizeText(opts[i].trim());
            float  xPos    = optX + (i % 2 == 0 ? 0 : colW);
            float  boxY    = curY - 16f;

            // Circle background — light blue
            fillCircle(cs, xPos + 8f, boxY + 6f, 9f,
                    new float[]{0.88f, 0.93f, 1.0f});

            // Label A/B/C/D
            setFillColor(cs, COLOR_HEADER_BG);
            cs.setFont(bold, 8f);
            cs.beginText();
            cs.newLineAtOffset(
                    xPos + (i < 2 ? 5f : 5f), boxY + 3f);
            cs.showText(String.valueOf(labels[i]));
            cs.endText();

            // Option text
            drawText(cs, optText, regular, 9.5f,
                    COLOR_DARK, xPos + 22f, boxY + 3f);

            // Move to next row after every 2 options
            if (i % 2 == 1) curY -= 20f;
        }

        // Handle odd number of options
        if (opts.length % 2 != 0) curY -= 20f;

        return curY - 6f;
    }

    // ────────────────────────────────────────
    //   TRUE/FALSE OPTIONS
    // ────────────────────────────────────────

    private float drawTrueFalseOptions(PDPageContentStream cs,
            float y) throws IOException {

        float optX = MARGIN + 30f;
        float boxY = y - 18f;

        // ── TRUE — green pill ──
        fillRoundRect(cs, optX, boxY, 65f, 18f,
                new float[]{0.07f, 0.60f, 0.32f});
        drawText(cs, "  TRUE",
                new PDType1Font(FontName.HELVETICA_BOLD),
                9.5f, COLOR_WHITE, optX + 12f, boxY + 5f);

        // ── FALSE — red pill ──
        fillRoundRect(cs, optX + 80f, boxY, 65f, 18f,
                COLOR_RED);
        drawText(cs, "  FALSE",
                new PDType1Font(FontName.HELVETICA_BOLD),
                9.5f, COLOR_WHITE, optX + 91f, boxY + 5f);

        return boxY - 10f;
    }

    // ────────────────────────────────────────
    //   ANSWER LINES (SHORT / LONG)
    // ────────────────────────────────────────

    private float drawAnswerLines(PDPageContentStream cs,
            PDType1Font italic,
            float y, int lineCount) throws IOException {

        float lineX = MARGIN + 30f;
        float lineW = CONTENT_WIDTH - 38f;
        float curY  = y - 6f;

        drawText(cs, "Answer :",
                italic, 8f, COLOR_GRAY_TEXT,
                lineX, curY);
        curY -= 12f;

        for (int i = 0; i < lineCount; i++) {
            setStrokeColor(cs, new float[]{0.72f, 0.72f, 0.78f});
            cs.setLineWidth(0.5f);
            cs.moveTo(lineX, curY);
            cs.lineTo(lineX + lineW, curY);
            cs.stroke();
            curY -= 17f;
        }

        return curY - 4f;
    }

    // ────────────────────────────────────────
    //   FILL IN THE BLANK
    // ────────────────────────────────────────

    private float drawFillBlankHint(PDPageContentStream cs,
            PDType1Font italic, float y) throws IOException {

        float hY = y - 14f;
        drawText(cs,
                "Answer : _________________________________",
                italic, 9.5f,
                new float[]{0.42f, 0.42f, 0.48f},
                MARGIN + 30f, hY);
        return hY - 10f;
    }

    // ────────────────────────────────────────
    //   ANSWER KEY PAGE
    // ────────────────────────────────────────

    private void drawAnswerKey(PDPageContentStream cs,
            List<PaperQuestion> questions,
            PDType1Font bold, PDType1Font regular, PDType1Font italic)
            throws IOException {

        float y = PAGE_HEIGHT - MARGIN;

        // ── Deep green header ──
        fillRect(cs, 0f, y - 75f, PAGE_WIDTH, 75f, COLOR_ANSWER_BG);
        fillRect(cs, 0f, y - 5f,  PAGE_WIDTH, 5f,  COLOR_ACCENT);

        drawTextCentered(cs, "ANSWER KEY",
                bold, 22f, COLOR_WHITE, y - 34f);
        drawTextCentered(cs,
                "FOR TEACHER USE ONLY  —  STRICTLY CONFIDENTIAL",
                italic, 9f,
                new float[]{0.82f, 0.82f, 0.82f}, y - 54f);

        fillRect(cs, 0f, y - 75f, PAGE_WIDTH, 4f, COLOR_ACCENT);

        float tY   = y - 92f;
        float rowH = 24f;

        // Column positions
        float cNo   = MARGIN;
        float cQ    = MARGIN + 38f;
        float cAns  = cQ    + 215f;
        float cType = cAns  + 155f;
        float cMark = cType + 65f;

        // ── Table header ──
        fillRect(cs, MARGIN, tY - rowH, CONTENT_WIDTH, rowH,
                new float[]{0.04f, 0.28f, 0.16f});

        String[] hLabels = {"No", "Question", "Correct Answer",
                "Type", "Marks"};
        float[]  hCols   = {cNo + 6f, cQ + 4f,
                cAns + 4f, cType + 4f, cMark + 4f};

        for (int i = 0; i < hLabels.length; i++) {
            drawText(cs, hLabels[i], bold, 9f,
                    COLOR_WHITE, hCols[i], tY - 16f);
        }

        tY -= rowH;

        // ── Answer rows ──
        for (PaperQuestion pq : questions) {
            if (tY < 55f) break;

            Question q    = pq.getQuestion();
            boolean  even = pq.getQuestionOrder() % 2 == 0;

            fillRect(cs, MARGIN, tY - rowH,
                    CONTENT_WIDTH, rowH,
                    even ? COLOR_ANSWER_ROW
                         : new float[]{1.0f, 1.0f, 1.0f});

            // Q No
            drawText(cs, String.valueOf(pq.getQuestionOrder()),
                    bold, 9.5f, COLOR_HEADER_BG,
                    cNo + 12f, tY - 16f);

            // Question (truncated)
            String qShort = sanitizeText(q.getQuestionText());
            if (qShort.length() > 38)
                qShort = qShort.substring(0, 38) + "...";
            drawText(cs, qShort, regular, 8.5f,
                    COLOR_DARK, cQ + 4f, tY - 16f);

            // Answer (green highlight)
            String ans = sanitizeText(
                    q.getAnswer() != null ? q.getAnswer() : "-");
            if (ans.length() > 30) ans = ans.substring(0, 30) + "...";

            fillRect(cs, cAns, tY - rowH + 3f,
                    148f, rowH - 6f,
                    new float[]{0.83f, 0.96f, 0.86f});
            drawText(cs, ans, bold, 8.5f,
                    new float[]{0.04f, 0.38f, 0.14f},
                    cAns + 5f, tY - 16f);

            // Type
            drawText(cs, formatQuestionType(q.getQuestionType()),
                    italic, 8f, COLOR_SECTION_BG,
                    cType + 4f, tY - 16f);

            // Marks
            drawText(cs, String.valueOf(q.getMarks()),
                    bold, 9f, COLOR_ACCENT,
                    cMark + 8f, tY - 16f);

            // Row divider
            setStrokeColor(cs, new float[]{0.82f, 0.90f, 0.85f});
            cs.setLineWidth(0.4f);
            cs.moveTo(MARGIN, tY - rowH);
            cs.lineTo(PAGE_WIDTH - MARGIN, tY - rowH);
            cs.stroke();

            tY -= rowH;
        }

        // ── Table outer border ──
        setStrokeColor(cs, COLOR_ANSWER_BG);
        cs.setLineWidth(1.5f);
        float tableH = y - 92f - tY;
        cs.addRect(MARGIN, tY, CONTENT_WIDTH, tableH);
        cs.stroke();

        // ── Confidential footer ──
        drawTextCentered(cs,
                "This document is confidential. " +
                "Do NOT distribute to students.",
                italic, 8f, COLOR_GRAY_TEXT, 40f);
    }

    // ────────────────────────────────────────
    //   PAGE NUMBERS
    // ────────────────────────────────────────

    private void addPageNumbers(PDDocument document,
            PDType1Font bold, PDType1Font italic)
            throws IOException {

        int total = document.getNumberOfPages();

        for (int i = 0; i < total; i++) {
            PDPage page = document.getPage(i);

            PDPageContentStream cs = new PDPageContentStream(
                    document, page,
                    PDPageContentStream.AppendMode.APPEND, true);

            // ── Footer background ──
            fillRect(cs, 0f, 0f, PAGE_WIDTH, 30f,
                    new float[]{0.95f, 0.95f, 0.97f});

            // ── Gold top line of footer ──
            setStrokeColor(cs, COLOR_ACCENT);
            cs.setLineWidth(1.5f);
            cs.moveTo(0f, 30f);
            cs.lineTo(PAGE_WIDTH, 30f);
            cs.stroke();

            // ── Left — Pariksha.io ──
            drawText(cs, "Pariksha.io",
                    bold, 8f, COLOR_SECTION_BG, MARGIN, 11f);

            // ── Center — Page x of y ──
            String pg = "Page " + (i + 1) + " / " + total;
            drawTextCentered(cs, pg, bold, 8f,
                    new float[]{0.40f, 0.40f, 0.45f}, 11f);

            // ── Right — Generated by ──
            String right = "Generated by Pariksha.io";
            float  rX    = PAGE_WIDTH - MARGIN
                    - getTextWidth(right, italic, 7.5f);
            drawText(cs, right, italic, 7.5f,
                    new float[]{0.60f, 0.60f, 0.65f}, rX, 11f);

            cs.close();
        }
    }

    // ────────────────────────────────────────
    //   PAGE BORDER
    // ────────────────────────────────────────

    private void drawPageBorder(PDPageContentStream cs)
            throws IOException {
        setStrokeColor(cs, new float[]{0.86f, 0.86f, 0.90f});
        cs.setLineWidth(1.2f);
        cs.addRect(12f, 32f,
                PAGE_WIDTH - 24f, PAGE_HEIGHT - 44f);
        cs.stroke();
    }

    // ────────────────────────────────────────
    //   ESTIMATE QUESTION HEIGHT
    // ────────────────────────────────────────

    private float estimateQuestionHeight(Question q) {
        float base = 50f;
        switch (q.getQuestionType()) {
            case MCQ            -> base += 50f;
            case TRUE_FALSE     -> base += 30f;
            case SHORT_ANSWER   -> base += 60f;
            case LONG_ANSWER    -> base += 120f;
            case FILL_IN_THE_BLANK -> base += 25f;
        }
        // Add for long question text
        int textLen = q.getQuestionText() != null
                ? q.getQuestionText().length() : 0;
        base += (textLen / 80) * 15f;
        return base;
    }

    // ────────────────────────────────────────
    //   DRAWING PRIMITIVES
    // ────────────────────────────────────────

    private void fillRect(PDPageContentStream cs,
            float x, float y, float w, float h,
            float[] rgb) throws IOException {
        setFillColor(cs, rgb);
        cs.addRect(x, y, w, h);
        cs.fill();
    }

    // Simulated rounded rect — PDFBox has no native support
    private void fillRoundRect(PDPageContentStream cs,
            float x, float y, float w, float h,
            float[] rgb) throws IOException {
        setFillColor(cs, rgb);
        cs.addRect(x + 3f, y, w - 6f, h);
        cs.fill();
        cs.addRect(x, y + 3f, w, h - 6f);
        cs.fill();
    }

    // Bezier-approximated circle
    private void fillCircle(PDPageContentStream cs,
            float cx, float cy, float r,
            float[] rgb) throws IOException {
        setFillColor(cs, rgb);
        float k = 0.5523f * r;
        cs.moveTo(cx - r, cy);
        cs.curveTo(cx - r, cy + k, cx - k, cy + r, cx, cy + r);
        cs.curveTo(cx + k, cy + r, cx + r, cy + k, cx + r, cy);
        cs.curveTo(cx + r, cy - k, cx + k, cy - r, cx, cy - r);
        cs.curveTo(cx - k, cy - r, cx - r, cy - k, cx - r, cy);
        cs.fill();
    }

    // Fill color only
    private void setFillColor(PDPageContentStream cs, float[] rgb)
            throws IOException {
        cs.setNonStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    // Stroke color only
    private void setStrokeColor(PDPageContentStream cs, float[] rgb)
            throws IOException {
        cs.setStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    // Both fill + stroke
    private void setColor(PDPageContentStream cs, float[] rgb)
            throws IOException {
        cs.setNonStrokingColor(rgb[0], rgb[1], rgb[2]);
        cs.setStrokingColor(rgb[0], rgb[1], rgb[2]);
    }

    private void drawText(PDPageContentStream cs,
            String text, PDFont font, float size,
            float[] rgb, float x, float y) throws IOException {
        if (text == null || text.isBlank()) return;
        cs.setNonStrokingColor(rgb[0], rgb[1], rgb[2]);
        cs.setFont(font, size);
        cs.beginText();
        cs.newLineAtOffset(x, y);
        cs.showText(sanitizeText(text));
        cs.endText();
    }

    private void drawTextCentered(PDPageContentStream cs,
            String text, PDFont font, float size,
            float[] rgb, float y) throws IOException {
        if (text == null || text.isBlank()) return;
        float w = getTextWidth(text, font, size);
        float x = (PAGE_WIDTH - w) / 2f;
        drawText(cs, text, font, size, rgb, x, y);
    }

    private void drawVerticalDivider(PDPageContentStream cs,
            float x, float y, float h) throws IOException {
        setStrokeColor(cs, new float[]{0.72f, 0.83f, 0.94f});
        cs.setLineWidth(0.8f);
        cs.moveTo(x, y);
        cs.lineTo(x, y + h);
        cs.stroke();
    }

    private void drawDetailCell(PDPageContentStream cs,
            String label, String value,
            PDType1Font bold, PDType1Font regular,
            float x, float labelY, float valueY)
            throws IOException {
        drawText(cs, label, bold, 7.5f,
                COLOR_BLUE_LABEL, x, labelY);
        drawText(cs, value, bold, 11.5f,
                COLOR_HEADER_BG, x, valueY);
    }

    private float getTextWidth(String text, PDFont font, float size)
            throws IOException {
        return font.getStringWidth(sanitizeText(text)) / 1000f * size;
    }

    private String sanitizeText(String text) {
        if (text == null) return "";
        return text.chars()
                .filter(c -> c >= 32 && c <= 126)
                .collect(StringBuilder::new,
                        StringBuilder::appendCodePoint,
                        StringBuilder::append)
                .toString();
    }

    private String[] wrapText(String text, PDFont font,
            float size, float maxW) {
        if (text == null || text.isBlank())
            return new String[]{};

        String[]          words   = text.split(" ");
        StringBuilder     line    = new StringBuilder();
        List<String>      lines   = new ArrayList<>();

        for (String word : words) {
            String test = line.isEmpty()
                    ? word : line + " " + word;
            try {
                if (getTextWidth(test, font, size) > maxW
                        && !line.isEmpty()) {
                    lines.add(line.toString());
                    line = new StringBuilder(word);
                } else {
                    line = new StringBuilder(test);
                }
            } catch (IOException e) {
                line.append(" ").append(word);
            }
        }

        if (!line.isEmpty()) lines.add(line.toString());
        return lines.toArray(new String[0]);
    }

    private String formatQuestionType(QuestionType type) {
        return switch (type) {
            case MCQ               -> "MCQ";
            case SHORT_ANSWER      -> "Short Ans";
            case LONG_ANSWER       -> "Long Ans";
            case TRUE_FALSE        -> "True/False";
            case FILL_IN_THE_BLANK -> "Fill Blank";
        };
    }
}