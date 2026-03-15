import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { saveAs } from "file-saver";

export const generateEthicsDoc = async (studentData, results, questions, answers) => {
  const questionParagraphs = questions.flatMap((q, index) => {
    const studentAnswer = answers[q.id];
    let answerText = studentAnswer;
    let isCorrect = false;

    if (q.type === 'choice') {
      const option = q.options.find(o => o.id === studentAnswer);
      answerText = option ? option.text : "Sin respuesta";
      isCorrect = studentAnswer === q.correctAnswer;
    } else if (q.type === 'scale') {
      isCorrect = parseInt(studentAnswer) >= 8;
    } else if (q.type === 'open') {
      const keywords = ["sostenibilidad", "ambiente", "comunidad", "responsabilidad", "ética", "seguridad", "futuro", "minería"];
      isCorrect = keywords.some(word => studentAnswer?.toLowerCase().includes(word));
    }

    return [
      new Paragraph({
        children: [
          new TextRun({ text: `${index + 1}. ${q.text}`, bold: true }),
        ],
        spacing: { before: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Respuesta: ", bold: true }),
          new TextRun({ text: String(answerText) }),
          new TextRun({ 
            text: isCorrect ? " (Correcta)" : " (Incorrecta/A mejorar)", 
            color: isCorrect ? "228B22" : "B22222",
            bold: true 
          }),
        ],
      }),
    ];
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "EVALUACIÓN DIAGNÓSTICA: ÉTICA EN INGENIERÍA EN MINAS",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            children: [
              new TextRun({ text: `Estudiante: `, bold: true }),
              new TextRun(`${studentData.name}`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Correo: `, bold: true }),
              new TextRun(`${studentData.email}`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Fecha: `, bold: true }),
              new TextRun(`${new Date().toLocaleDateString()}`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "RESULTADOS GENERALES",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Puntaje Total: `, bold: true }),
              new TextRun(`${results.score} / 10`),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Nivel de Logro: `, bold: true }),
              new TextRun(`${results.level}`),
            ],
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "SÍNTESIS DEL PERFIL ÉTICO",
            heading: HeadingLevel.HEADING_2,
          }),
          new Paragraph({
            text: results.profileDescription,
          }),
          new Paragraph({ text: "" }),
          new Paragraph({
            text: "DETALLE POR PREGUNTA",
            heading: HeadingLevel.HEADING_2,
          }),
          ...questionParagraphs,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Evaluacion_Etica_${studentData.name.replace(/\s+/g, "_")}_${new Date().toISOString().split('T')[0]}.docx`);
};
