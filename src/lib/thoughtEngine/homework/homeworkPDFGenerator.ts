/**
 * Homework Rescue - PDF Generator
 *
 * Generates three PDF documents for each lesson:
 * 1. Practice Sheet - Problems for the child to work on
 * 2. Answer Key - Solutions with explanations
 * 3. Parent Summary - How to reinforce the learning
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import {
  LessonScript,
  HomeworkIntake,
  PracticeItem,
  ParentSummary
} from './types';

// Color schemes
const COLORS = {
  primary: '#4F46E5',      // Indigo
  secondary: '#818CF8',    // Light indigo
  accent: '#F59E0B',       // Amber
  text: '#1F2937',         // Dark gray
  lightText: '#6B7280',    // Medium gray
  background: '#F9FAFB',   // Light gray
  success: '#10B981',      // Green
  border: '#E5E7EB'        // Light border
};

// Font sizes
const FONTS = {
  title: 28,
  subtitle: 18,
  heading: 16,
  body: 12,
  small: 10
};

/**
 * Generate all PDFs for a lesson
 */
export async function generateHomeworkPDFs(
  script: LessonScript,
  intake: HomeworkIntake,
  orderId: string
): Promise<{
  practiceSheetPath: string;
  answerKeyPath: string;
  parentSummaryPath: string;
}> {
  const outputDir = path.join(process.cwd(), 'outputs', 'homework', orderId);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const practiceSheetPath = path.join(outputDir, 'practice_sheet.pdf');
  const answerKeyPath = path.join(outputDir, 'answer_key.pdf');
  const parentSummaryPath = path.join(outputDir, 'parent_summary.pdf');

  await Promise.all([
    generatePracticeSheet(script, intake, practiceSheetPath),
    generateAnswerKey(script, intake, answerKeyPath),
    generateParentSummary(script, intake, parentSummaryPath)
  ]);

  return {
    practiceSheetPath,
    answerKeyPath,
    parentSummaryPath
  };
}

/**
 * Generate the Practice Sheet PDF
 */
async function generatePracticeSheet(
  script: LessonScript,
  intake: HomeworkIntake,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.title)
      .text(`${intake.childName}'s Practice Sheet`, { align: 'center' });

    doc
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.subtitle)
      .text(`${script.subject}: ${script.topic}`, { align: 'center' })
      .moveDown(0.5);

    doc
      .fillColor(COLORS.accent)
      .fontSize(FONTS.small)
      .text(`Grade ${script.grade}`, { align: 'center' })
      .moveDown(2);

    // Encouraging intro
    doc
      .fillColor(COLORS.text)
      .fontSize(FONTS.body)
      .text(`Great job watching the lesson, ${intake.childName}! Now it's time to practice what you learned.`, { align: 'left' })
      .moveDown(0.5)
      .text(`Take your time with each problem. Remember: making mistakes is how we learn!`, { align: 'left' })
      .moveDown(2);

    // Practice problems from first practice
    if (script.firstPractice.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.primary)
        .fontSize(FONTS.heading)
        .text('Practice Problems - Set 1', { underline: true })
        .moveDown(1);

      script.firstPractice.practiceItems.forEach((item, i) => {
        drawProblemBox(doc, item, i + 1);
        doc.moveDown(1.5);
      });
    }

    doc.moveDown(1);

    // Practice problems from second practice
    if (script.secondPractice.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.primary)
        .fontSize(FONTS.heading)
        .text('Practice Problems - Set 2', { underline: true })
        .moveDown(1);

      const startNum = script.firstPractice.practiceItems.length + 1;
      script.secondPractice.practiceItems.forEach((item, i) => {
        drawProblemBox(doc, item, startNum + i);
        doc.moveDown(1.5);
      });
    }

    doc.moveDown(1);

    // Challenge problem
    if (script.miniChallenge.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.accent)
        .fontSize(FONTS.heading)
        .text('Challenge Problem!', { underline: true })
        .moveDown(1);

      script.miniChallenge.practiceItems.forEach((item, i) => {
        drawProblemBox(doc, item, 0, true);
        doc.moveDown(1.5);
      });
    }

    // Footer
    doc
      .moveDown(2)
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.small)
      .text('Personalized Output - Homework Rescue', { align: 'center' })
      .text('personalizedoutput.com', { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Generate the Answer Key PDF
 */
async function generateAnswerKey(
  script: LessonScript,
  intake: HomeworkIntake,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc
      .fillColor(COLORS.success)
      .fontSize(FONTS.title)
      .text('Answer Key', { align: 'center' });

    doc
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.subtitle)
      .text(`${intake.childName}'s ${script.topic} Practice`, { align: 'center' })
      .moveDown(2);

    // All answers with explanations
    let problemNum = 1;

    // First practice answers
    if (script.firstPractice.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.primary)
        .fontSize(FONTS.heading)
        .text('Set 1 Answers', { underline: true })
        .moveDown(1);

      script.firstPractice.practiceItems.forEach((item) => {
        drawAnswerBox(doc, item, problemNum);
        problemNum++;
        doc.moveDown(1);
      });

      doc.moveDown(1);
    }

    // Second practice answers
    if (script.secondPractice.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.primary)
        .fontSize(FONTS.heading)
        .text('Set 2 Answers', { underline: true })
        .moveDown(1);

      script.secondPractice.practiceItems.forEach((item) => {
        drawAnswerBox(doc, item, problemNum);
        problemNum++;
        doc.moveDown(1);
      });

      doc.moveDown(1);
    }

    // Challenge answer
    if (script.miniChallenge.practiceItems.length > 0) {
      doc
        .fillColor(COLORS.accent)
        .fontSize(FONTS.heading)
        .text('Challenge Answer', { underline: true })
        .moveDown(1);

      script.miniChallenge.practiceItems.forEach((item) => {
        drawAnswerBox(doc, item, 0, true);
        doc.moveDown(1);
      });
    }

    // Grading notes
    doc
      .moveDown(2)
      .fillColor(COLORS.text)
      .fontSize(FONTS.body)
      .text('Grading Tips:', { underline: true })
      .moveDown(0.5)
      .fontSize(FONTS.small)
      .text(`• Focus on understanding, not just the right answer`)
      .text(`• Celebrate effort and improvement`)
      .text(`• If ${intake.childName} got most right, they're ready to move on!`)
      .text(`• If they struggled, re-watch that part of the lesson together`);

    // Footer
    doc
      .moveDown(2)
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.small)
      .text('Personalized Output - Homework Rescue', { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Generate the Parent Summary PDF
 */
async function generateParentSummary(
  script: LessonScript,
  intake: HomeworkIntake,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const stream = fs.createWriteStream(outputPath);
    doc.pipe(stream);

    // Header
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.title)
      .text('Parent Summary', { align: 'center' });

    doc
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.subtitle)
      .text(`${intake.childName}'s Personalized Lesson`, { align: 'center' })
      .moveDown(0.5)
      .fillColor(COLORS.accent)
      .fontSize(FONTS.small)
      .text(`${script.subject}: ${script.topic} | Grade ${script.grade}`, { align: 'center' })
      .moveDown(2);

    // What we covered
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.heading)
      .text('What We Covered', { underline: true })
      .moveDown(0.5)
      .fillColor(COLORS.text)
      .fontSize(FONTS.body)
      .text(script.parentSummary.whatWeLearned)
      .moveDown(1.5);

    // Key concept
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.heading)
      .text('The Key Concept', { underline: true })
      .moveDown(0.5)
      .fillColor(COLORS.text)
      .fontSize(FONTS.body)
      .text(script.parentSummary.keyConceptExplained)
      .moveDown(1.5);

    // How to reinforce
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.heading)
      .text('How to Reinforce at Home', { underline: true })
      .moveDown(0.5);

    script.parentSummary.howToReinforce.forEach((tip) => {
      doc
        .fillColor(COLORS.success)
        .fontSize(FONTS.body)
        .text('✓ ', { continued: true })
        .fillColor(COLORS.text)
        .text(tip);
    });
    doc.moveDown(1.5);

    // Signs of progress
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.heading)
      .text('Signs of Progress to Watch For', { underline: true })
      .moveDown(0.5);

    script.parentSummary.signsOfProgress.forEach((sign) => {
      doc
        .fillColor(COLORS.accent)
        .fontSize(FONTS.body)
        .text('★ ', { continued: true })
        .fillColor(COLORS.text)
        .text(sign);
    });
    doc.moveDown(1.5);

    // Next steps
    if (script.parentSummary.nextSteps) {
      doc
        .fillColor(COLORS.primary)
        .fontSize(FONTS.heading)
        .text('Next Steps', { underline: true })
        .moveDown(0.5)
        .fillColor(COLORS.text)
        .fontSize(FONTS.body)
        .text(script.parentSummary.nextSteps)
        .moveDown(1.5);
    }

    // The struggle we addressed
    doc
      .fillColor(COLORS.primary)
      .fontSize(FONTS.heading)
      .text('The Challenge We Addressed', { underline: true })
      .moveDown(0.5)
      .fillColor(COLORS.text)
      .fontSize(FONTS.body)
      .text(`${intake.childName} was struggling with: ${intake.whereStuck}`)
      .moveDown(0.5)
      .text(`This lesson addressed this by explaining the concept using ${intake.childName}'s love of ${intake.interest}.`)
      .moveDown(1.5);

    // Remake offer
    doc
      .rect(50, doc.y, 500, 80)
      .fillAndStroke(COLORS.background, COLORS.border);

    doc
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .fontSize(FONTS.body)
      .text('Not quite right?', 70, doc.y - 65)
      .font('Helvetica')
      .fontSize(FONTS.small)
      .text('If this lesson didn\'t click for your child, you can request one free remake.', 70)
      .text('Just visit personalizedoutput.com/homework-rescue/remake', 70)
      .moveDown(3);

    // Footer
    doc
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.small)
      .text('Thank you for choosing Personalized Output!', { align: 'center' })
      .text('Questions? Email us at support@personalizedoutput.com', { align: 'center' });

    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

/**
 * Draw a problem box on the PDF
 */
function drawProblemBox(
  doc: PDFKit.PDFDocument,
  item: PracticeItem,
  num: number,
  isChallenge: boolean = false
): void {
  const startY = doc.y;
  const boxColor = isChallenge ? COLORS.accent : COLORS.secondary;

  // Problem number circle
  doc
    .circle(70, startY + 10, 12)
    .fillColor(boxColor)
    .fill();

  doc
    .fillColor('#FFFFFF')
    .fontSize(FONTS.body)
    .text(isChallenge ? '★' : String(num), 64, startY + 4);

  // Problem text
  doc
    .fillColor(COLORS.text)
    .fontSize(FONTS.body)
    .text(item.problem, 95, startY, { width: 420 });

  // Answer space
  const answerY = doc.y + 10;
  doc
    .rect(95, answerY, 420, 40)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .dash(3, { space: 3 })
    .stroke()
    .undash();

  doc
    .fillColor(COLORS.lightText)
    .fontSize(FONTS.small)
    .text('Your answer:', 100, answerY + 5);

  doc.y = answerY + 45;
}

/**
 * Draw an answer box on the PDF
 */
function drawAnswerBox(
  doc: PDFKit.PDFDocument,
  item: PracticeItem,
  num: number,
  isChallenge: boolean = false
): void {
  const startY = doc.y;

  // Problem number
  doc
    .fillColor(isChallenge ? COLORS.accent : COLORS.primary)
    .fontSize(FONTS.body)
    .text(isChallenge ? 'Challenge:' : `${num}.`, 50, startY, { continued: true })
    .fillColor(COLORS.text)
    .text(` ${item.problem}`);

  // Answer
  doc
    .fillColor(COLORS.success)
    .fontSize(FONTS.body)
    .text(`   Answer: ${item.answer}`, { indent: 20 });

  // Explanation if available
  if (item.explanation) {
    doc
      .fillColor(COLORS.lightText)
      .fontSize(FONTS.small)
      .text(`   Explanation: ${item.explanation}`, { indent: 20 });
  }
}

/**
 * Upload PDFs to storage
 */
export async function uploadPDFs(
  paths: {
    practiceSheetPath: string;
    answerKeyPath: string;
    parentSummaryPath: string;
  },
  orderId: string
): Promise<{
  practiceSheetUrl: string;
  answerKeyUrl: string;
  parentSummaryUrl: string;
}> {
  const publicDir = path.join(process.cwd(), 'public', 'homework-pdfs');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const baseUrl = process.env.BASE_URL || 'https://personalizedoutput.com';

  // Copy to public directory
  const practiceSheetDest = path.join(publicDir, `practice_${orderId}.pdf`);
  const answerKeyDest = path.join(publicDir, `answers_${orderId}.pdf`);
  const parentSummaryDest = path.join(publicDir, `summary_${orderId}.pdf`);

  fs.copyFileSync(paths.practiceSheetPath, practiceSheetDest);
  fs.copyFileSync(paths.answerKeyPath, answerKeyDest);
  fs.copyFileSync(paths.parentSummaryPath, parentSummaryDest);

  return {
    practiceSheetUrl: `${baseUrl}/homework-pdfs/practice_${orderId}.pdf`,
    answerKeyUrl: `${baseUrl}/homework-pdfs/answers_${orderId}.pdf`,
    parentSummaryUrl: `${baseUrl}/homework-pdfs/summary_${orderId}.pdf`
  };
}
