/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  BookOpen, 
  ClipboardCheck, 
  User, 
  Mail, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  GraduationCap,
  HardHat,
  Info,
  Library,
  Monitor,
  Layers,
  FileText,
  LogOut
} from 'lucide-react';
import { generateEthicsDoc } from './utils/docGenerator';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, getDocFromServer, doc } from 'firebase/firestore';

// --- Error Handling Spec for Firestore Permissions ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: undefined, // auth not used for submission yet
      email: undefined,
      emailVerified: undefined,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
};

// Test connection
const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
  }
};
testConnection();

// --- Tipos ---
interface Student {
  name: string;
  email: string;
}

interface Question {
  id: number;
  text: string;
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  feedback?: string;
  type: 'choice' | 'scale' | 'open';
}

// --- Datos del Programa ---
const SYLLABUS = {
  units: [
    { title: "Unidad 1: Fundamentos de la ética", content: "1.1. Fundamentos de la ética profesional del/la ingeniero/a; 1.2. Empresa y éxito profesional; 1.3. Actividad económica y los stakeholders, visión integral de empresa y de la profesión." },
    { title: "Unidad 2: La ética profesional para el ejercicio de la profesión de ingeniero/a", content: "2.1. Naturaleza de la ética profesional; 2.2. Modelo ético centrado en la persona humana; 2.3. Evaluación ética y profesional." },
    { title: "Unidad 3: Dilemas éticos en la ingeniería", content: "3.1. Identificación y resolución de dilemas éticos en los negocios; 3.2. Competencia éticas y profesionales; 3.3. Decisiones éticas, evaluación de alternativas y consecuencias." },
    { title: "Unidad 4: Comportamiento y conducta ética", content: "4.1. Desarrollo de competencias éticas; 4.2. Relación con colegas, clientes y la sociedad; 4.3. Implementación de decisiones éticas en proyectos de ingeniería." }
  ],
  evaluation: [
    { title: "Evaluación Diagnóstica", content: "Preguntas indagatorias. Retroalimentación." },
    { title: "Evaluación Formativa", content: "Trabajos grupales. Retroalimentación." },
    { title: "Evaluación Sumativa", content: "Prueba escrita mixta (20%); Prueba escrita mixta (20%); Análisis de casos (40%); Actividades virtuales en plataforma virtual (20%)." }
  ],
  bibliography: {
    obligatory: [
      "Melé, D. (2022). Ética Profesional. Ediciones UC.",
      "Sonnenfeld, A. (2020). Liderazgo ético. Aula magna.",
      "Valencia Gutiérrez, A. (2015). El principio de la ética. Ensayo de interpretación del pensamiento de Estanislao Zuleta (2da. Edición)."
    ],
    complementary: [
      "Molina Velásquez, C. (2012). Ética profesional y organizacional. UCA editores.",
      "Weiss, J. W. (n.d.). Ética en los negocios: un enfoque de administración de los Stakeholders y de casos (4ta. Edición). Internacional libros."
    ]
  },
  resources: {
    it: [
      "Plataforma Moodle Institucional.",
      "Biblioteca Digital UDA (https://bibliotecadigital.uda.cl)",
      "Colección Digital UDA (https://colecciondigital.uda.cl)"
    ],
    others: [
      "Herramientas de ofimática (Word, Excel, Power Point)",
      "Herramientas digitales educativas"
    ]
  }
};

const QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'choice',
    text: "¿Cuál principio ético prioriza el programa en minería?",
    options: [
      { id: 'a', text: "Ganancias rápidas" },
      { id: 'b', text: "Integridad y respeto ambiental" },
      { id: 'c', text: "Competencia individual" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: La integridad y el respeto ambiental son pilares de la minería moderna y responsable."
  },
  {
    id: 2,
    type: 'choice',
    text: "En yacimiento con contaminación, ¿qué norma ética aplica?",
    options: [
      { id: 'a', text: "Ocultar para evitar multas" },
      { id: 'b', text: "Transparencia con comunidades y autoridades" },
      { id: 'c', text: "Solo reportar si hay accidente" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: La transparencia es fundamental para la licencia social para operar."
  },
  {
    id: 3,
    type: 'choice',
    text: "Fundamento clave de ética minera:",
    options: [
      { id: 'a', text: "Maximizar shareholder value" },
      { id: 'b', text: "Bien común y sostenibilidad" },
      { id: 'c', text: "Éxito personal por encima de todo" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: El bien común y la sostenibilidad aseguran el futuro de la industria y el entorno."
  },
  {
    id: 4,
    type: 'choice',
    text: "Caso: “Presión para acelerar extracción ignorando fisuras”. Elige una opción de acción frente a esa situación:",
    options: [
      { id: 'a', text: "Ignorar y producir" },
      { id: 'b', text: "Reportar a superior y documentar" },
      { id: 'c', text: "Esperar a ver consecuencias" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: La seguridad de los trabajadores y la integridad de la mina son prioritarias."
  },
  {
    id: 5,
    type: 'choice',
    text: "¿Cuál de las siguientes priorizarías en una operación minera?",
    options: [
      { id: 'a', text: "Maximizar producción" },
      { id: 'b', text: "Seguridad de las comunidades" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: La seguridad de las comunidades es un valor ético intransable."
  },
  {
    id: 6,
    type: 'choice',
    text: "De estos pasos éticos en un dilema minero, ¿cuál es el primer paso a dar?",
    options: [
      { id: 'a', text: "Analizar alternativas" },
      { id: 'b', text: "Identificar dilema - Evaluar consecuencias - Decidir" }
    ],
    correctAnswer: 'b',
    feedback: "Correcto: Identificar el dilema es el punto de partida para cualquier análisis ético."
  },
  {
    id: 7,
    type: 'choice',
    text: "Caso: en un conflicto con comunidad indígena por agua. ¿Cuál sería la acción a implementar?",
    options: [
      { id: 'a', text: "Negociar diálogo transparente" },
      { id: 'b', text: "Ignorar si no afecta producción" }
    ],
    correctAnswer: 'a',
    feedback: "Correcto: El diálogo transparente es la única vía ética para resolver conflictos socio-ambientales."
  },
  {
    id: 8,
    type: 'choice',
    text: "“Transparencia con stakeholders indígenas es opcional”:",
    options: [
      { id: 'a', text: "Totalmente de acuerdo" },
      { id: 'b', text: "Neutral" },
      { id: 'c', text: "Totalmente en desacuerdo" }
    ],
    correctAnswer: 'c',
    feedback: "Correcto: La transparencia es una obligación ética, no una opción."
  },
  {
    id: 9,
    type: 'scale',
    text: "Escala de 1 a 10: “Priorizo el cuidado del ambiente sobre el cumplimiento de plazos de producción”."
  },
  {
    id: 10,
    type: 'open',
    text: "¿Por qué es importante la ética en la ingeniería en minas?"
  }
];

export default function App() {
  const [step, setStep] = useState<'register' | 'home' | 'syllabus' | 'eval' | 'results'>('register');
  const [student, setStudent] = useState<Student | null>(null);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState("");
  const [attemptBlocked, setAttemptBlocked] = useState(false);

  // Cargar estudiante si existe en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('uda_student');
    if (saved) {
      setStudent(JSON.parse(saved));
      setStep('home');
    }
  }, []);

  const handleRegister = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) return setError("Todos los campos son obligatorios");
    
    const newStudent = { name, email };
    setStudent(newStudent);
    localStorage.setItem('uda_student', JSON.stringify(newStudent));
    setStep('home');
  };

  const handleLogout = () => {
    setStudent(null);
    localStorage.removeItem('uda_student');
    setStep('register');
    setAnswers({});
    setResults(null);
    setCurrentQuestion(0);
    setError("");
  };

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestion].id]: value }));
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    setShowFeedback(false);
    if (currentQuestion < QUESTIONS.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = async () => {
    let score = 0;
    QUESTIONS.forEach(q => {
      const ans = answers[q.id];
      if (q.type === 'choice' && ans === q.correctAnswer) score++;
      if (q.type === 'scale' && parseInt(ans) >= 8) score++;
      if (q.type === 'open') {
        const keywords = ["sostenibilidad", "ambiente", "comunidad", "responsabilidad", "ética", "seguridad", "futuro", "minería"];
        if (keywords.some(word => ans?.toLowerCase().includes(word))) score++;
      }
    });

    const level = score >= 8 ? "GUARDIÁN DE RIESGOS ÉTICO" : score >= 6 ? "Ingeniero Ético Avanzado" : "Ingeniero Ético en Progreso";
    const profileDescription = score >= 8 
      ? "Usted demuestra una sólida base ética, priorizando la sostenibilidad y la integridad por sobre presiones externas. Es un perfil idóneo para liderar proyectos mineros con responsabilidad social y ambiental."
      : "Usted posee conocimientos éticos fundamentales, pero debe fortalecer su capacidad de respuesta ante dilemas complejos donde la producción entra en conflicto con intereses socio-ambientales.";

    const detailedAnswers = QUESTIONS.map(q => {
      const ans = answers[q.id] || "";
      let answerText = ans;
      let isCorrect = false;

      if (q.type === 'choice') {
        const option = q.options?.find(o => o.id === ans);
        answerText = option ? option.text : ans;
        isCorrect = ans === q.correctAnswer;
      } else if (q.type === 'scale') {
        isCorrect = parseInt(ans) >= 8;
      } else if (q.type === 'open') {
        const keywords = ["sostenibilidad", "ambiente", "comunidad", "responsabilidad", "ética", "seguridad", "futuro", "minería"];
        isCorrect = keywords.some(word => ans?.toLowerCase().includes(word));
      }

      return {
        questionId: q.id,
        questionText: q.text,
        studentAnswer: answerText,
        status: isCorrect ? "Correcta" : "Incorrecta/A mejorar"
      };
    });

    const finalResults = { 
      score, 
      level, 
      profileDescription, 
      studentName: student.name, 
      studentEmail: student.email, 
      career: "Ingeniería en Minas",
      answers: detailedAnswers, 
      timestamp: serverTimestamp() 
    };
    setResults(finalResults);
    setStep('results');
    
    // Bloquear intento
    try {
      console.log("Saving to Firebase Project:", db.app.options.projectId);
      // Guardamos en la colección "evaluaciones_minas"
      await addDoc(collection(db, "evaluaciones_minas"), finalResults);
      console.log("Resultado guardado en la nube exitosamente");
    } catch (e) {
      const errInfo = handleFirestoreError(e, OperationType.CREATE, "evaluaciones_minas");
      alert(`Error al guardar en la base de datos: ${errInfo.error}\n\nPor favor, verifique que la base de datos Firestore esté creada en modo 'Producción' o 'Prueba' y que las reglas permitan la escritura.`);
    }    
    // Simular envío de correo
    console.log("Enviando reporte a litasanchezromero@gmail.com...");
  };

  const handleDownloadDoc = () => {
    if (student && results) {
      generateEthicsDoc(student, results, QUESTIONS, answers);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <HardHat className="text-amber-500" />
            <span className="font-bold tracking-tight hidden sm:inline">UDA VALLENAR | ÉTICA PROFESIONAL</span>
            <span className="font-bold sm:hidden">UDA ÉTICA</span>
          </div>
          {student && (
            <div className="flex items-center gap-4 text-sm">
              <span className="opacity-70 hidden md:inline">{student.email}</span>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setStep('home')}
                  className="hover:text-amber-500 transition-colors font-medium"
                >
                  Inicio
                </button>
                <div className="w-px h-4 bg-white/20" />
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1 hover:text-red-400 transition-colors font-medium"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        <AnimatePresence mode="wait">
          {/* REGISTRO */}
          {step === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md mx-auto mt-8 sm:mt-12"
            >
              <div className="text-center mb-8">
                <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="text-amber-600 w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold">Registro de Estudiante</h2>
                <p className="text-slate-500 text-sm">Ingeniería en Minas</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      name="name" 
                      type="text" 
                      placeholder="Ej: Juan Pérez"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Correo Institucional</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    <input 
                      name="email" 
                      type="email" 
                      placeholder="ejemplo@uda.cl"
                      className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-sm flex items-center gap-1"><AlertCircle size={14}/> {error}</p>}
                <button className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-all shadow-md">
                  Ingresar al Curso
                </button>
              </form>
            </motion.div>
          )}

          {/* HOME */}
          {step === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              <section className="relative h-48 sm:h-64 rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/mining/1200/600" 
                  className="w-full h-full object-cover brightness-50"
                  alt="Minería"
                />
                <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-8 text-white">
                  <h1 className="text-2xl sm:text-4xl font-black mb-2">ÉTICA PROFESIONAL</h1>
                  <p className="text-amber-400 font-medium tracking-widest uppercase text-[10px] sm:text-sm">Ingeniería en Minas | UDA Vallenar</p>
                </div>
              </section>

              <div className="grid md:grid-cols-2 gap-6">
                <div 
                  onClick={() => setStep('syllabus')}
                  className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-amber-500 cursor-pointer hover:shadow-lg transition-all"
                >
                  <BookOpen className="text-amber-600 mb-4" size={32} />
                  <h3 className="text-xl font-bold mb-2">Programa del Curso</h3>
                  <p className="text-slate-600 text-sm">Explora las unidades, competencias y resultados de aprendizaje de la asignatura.</p>
                </div>
                <div 
                  onClick={() => {
                    if (!student) return setError("Error: Datos de estudiante no encontrados.");
                    const isBlocked = student.email && localStorage.getItem(`attempt_${student.email}`);
                    if (isBlocked) {
                      setAttemptBlocked(true);
                      setTimeout(() => setAttemptBlocked(false), 3000);
                    } else {
                      setStep('eval');
                    }
                  }}
                  className={`bg-white p-6 rounded-2xl shadow-md border-l-4 cursor-pointer hover:shadow-lg transition-all relative overflow-hidden ${
                    student?.email && localStorage.getItem(`attempt_${student.email}`) 
                    ? 'border-slate-300 opacity-75' 
                    : 'border-slate-900'
                  }`}
                >
                  <ClipboardCheck className={`${student?.email && localStorage.getItem(`attempt_${student.email}`) ? 'text-slate-400' : 'text-slate-900'} mb-4`} size={32} />
                  <h3 className="text-xl font-bold mb-2">Evaluación Diagnóstica</h3>
                  <p className="text-slate-600 text-sm">Pon a prueba tus fundamentos éticos. (Intento único).</p>
                  
                  <AnimatePresence>
                    {attemptBlocked && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-4 text-center"
                      >
                        <p className="text-white text-sm font-bold flex items-center gap-2">
                          <AlertCircle size={16} className="text-amber-500" />
                          Ya has realizado tu intento único.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex justify-center">
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-500 font-bold hover:text-red-600 transition-colors"
                >
                  <LogOut size={18} />
                  Cerrar Sesión / Salir
                </button>
              </div>
            </motion.div>
          )}

          {/* SYLLABUS */}
          {step === 'syllabus' && (
            <motion.div key="syllabus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setStep('home')} className="p-2 hover:bg-slate-200 rounded-full"><ChevronRight className="rotate-180"/></button>
                <h2 className="text-3xl font-bold">Programa de Asignatura</h2>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 sm:p-6 bg-slate-900 text-white">
                  <h3 className="text-base sm:text-lg font-bold">Descripción de la Asignatura</h3>
                  <p className="text-slate-300 text-xs sm:text-sm mt-2">
                    Proporciona principios y valores éticos para guiar el comportamiento profesional; desarrolla reflexión crítica sobre acciones considerando implicancias morales y sociales.
                  </p>
                </div>
                <div className="p-4 sm:p-6 space-y-6">
                  <div className="flex items-center gap-2 text-amber-600 font-bold border-b border-amber-100 pb-2">
                    <Layers size={20} />
                    <span>Unidades de Aprendizaje</span>
                  </div>
                  {SYLLABUS.units.map((unit, i) => (
                    <div key={i} className="border-b border-slate-100 pb-4 last:border-0">
                      <h4 className="font-bold text-slate-800 mb-2">{unit.title}</h4>
                      <p className="text-slate-600 text-sm">{unit.content}</p>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 text-amber-600 font-bold border-b border-amber-100 pb-2 pt-4">
                    <ClipboardCheck size={20} />
                    <span>Sistema de Evaluación</span>
                  </div>
                  {SYLLABUS.evaluation.map((evalItem, i) => (
                    <div key={i} className="border-b border-slate-100 pb-4 last:border-0">
                      <h4 className="font-bold text-slate-800 mb-2">{evalItem.title}</h4>
                      <p className="text-slate-600 text-sm">{evalItem.content}</p>
                    </div>
                  ))}

                  <div className="flex items-center gap-2 text-amber-600 font-bold border-b border-amber-100 pb-2 pt-4">
                    <Library size={20} />
                    <span>Bibliografía</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Obligatoria</h5>
                      <ul className="space-y-2">
                        {SYLLABUS.bibliography.obligatory.map((book, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-amber-500">•</span>
                            {book}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Complementaria</h5>
                      <ul className="space-y-2">
                        {SYLLABUS.bibliography.complementary.map((book, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-amber-500">•</span>
                            {book}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-amber-600 font-bold border-b border-amber-100 pb-2 pt-4">
                    <Monitor size={20} />
                    <span>Recursos de Aprendizaje</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Informáticos</h5>
                      <ul className="space-y-2">
                        {SYLLABUS.resources.it.map((res, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-amber-500">•</span>
                            {res}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Otros Recursos</h5>
                      <ul className="space-y-2">
                        {SYLLABUS.resources.others.map((res, i) => (
                          <li key={i} className="text-sm text-slate-600 flex gap-2">
                            <span className="text-amber-500">•</span>
                            {res}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><ShieldCheck size={18}/> Competencias</h4>
                  <ul className="text-xs space-y-2 text-slate-700">
                    <li>• Aplica principios éticos en toma de decisiones.</li>
                    <li>• Garantiza justicia y bien común.</li>
                    <li>• Análisis crítico de información técnica.</li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold flex items-center gap-2 mb-2"><GraduationCap size={18}/> Aprendizaje</h4>
                  <ul className="text-xs space-y-2 text-slate-700">
                    <li>• Aplica marcos éticos en resolución de casos.</li>
                    <li>• Explica principios en industria minera.</li>
                    <li>• Considera impacto social y ambiental.</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {/* EVALUACIÓN */}
          {step === 'eval' && (
            <motion.div key="eval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="flex justify-between items-center mb-4 gap-4">
                <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-widest">Pregunta {currentQuestion + 1} de {QUESTIONS.length}</span>
                <div className="w-24 sm:w-32 h-2 bg-slate-200 rounded-full overflow-hidden shrink-0">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500" 
                    style={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-5 sm:p-8 rounded-3xl shadow-xl border border-slate-200">
                <h3 className="text-lg sm:text-xl font-bold mb-6 sm:mb-8">{QUESTIONS[currentQuestion].text}</h3>

                <div className="space-y-3">
                  {QUESTIONS[currentQuestion].type === 'choice' && QUESTIONS[currentQuestion].options?.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={showFeedback}
                      onClick={() => handleAnswer(opt.id)}
                      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all flex justify-between items-center gap-3 ${
                        answers[QUESTIONS[currentQuestion].id] === opt.id
                          ? opt.id === QUESTIONS[currentQuestion].correctAnswer 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50'
                          : 'border-slate-100 hover:border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      <span className="text-sm sm:text-base">{opt.text}</span>
                      {showFeedback && opt.id === QUESTIONS[currentQuestion].correctAnswer && <CheckCircle2 className="text-green-500" />}
                    </button>
                  ))}

                  {QUESTIONS[currentQuestion].type === 'scale' && (
                    <div className="space-y-4">
                      <input 
                        type="range" min="1" max="10" 
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        onChange={(e) => setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestion].id]: e.target.value }))}
                      />
                      <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>1 - Nada de acuerdo</span>
                        <span className="text-amber-600 text-lg">{answers[QUESTIONS[currentQuestion].id] || 5}</span>
                        <span>10 - Totalmente de acuerdo</span>
                      </div>
                      <button 
                        onClick={() => handleAnswer(answers[QUESTIONS[currentQuestion].id] || 5)}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
                      >
                        Confirmar Valor
                      </button>
                    </div>
                  )}

                  {QUESTIONS[currentQuestion].type === 'open' && (
                    <div className="space-y-4">
                      <textarea 
                        className="w-full p-4 border border-slate-200 rounded-xl h-32 outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Escriba su reflexión aquí..."
                        onChange={(e) => setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestion].id]: e.target.value }))}
                      />
                      <button 
                        onClick={() => handleAnswer(answers[QUESTIONS[currentQuestion].id])}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
                      >
                        Finalizar Evaluación
                      </button>
                    </div>
                  )}
                </div>

                {showFeedback && QUESTIONS[currentQuestion].type === 'choice' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }} 
                    animate={{ opacity: 1, height: 'auto' }}
                    className={`mt-6 p-4 rounded-xl flex gap-3 ${
                      answers[QUESTIONS[currentQuestion].id] === QUESTIONS[currentQuestion].correctAnswer 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    <Info size={20} className="shrink-0" />
                    <p className="text-sm">{QUESTIONS[currentQuestion].feedback}</p>
                  </motion.div>
                )}

                {showFeedback && (
                  <button 
                    onClick={nextQuestion}
                    className="mt-8 w-full bg-amber-500 text-white py-4 rounded-xl font-bold hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    {currentQuestion < QUESTIONS.length - 1 ? "Siguiente Pregunta" : "Ver Resultados"}
                    <ChevronRight />
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* RESULTADOS */}
          {step === 'results' && results && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6 sm:space-y-8 text-center">
              <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-2xl border border-slate-200">
                <div className="mb-6">
                  <div className="inline-block p-3 sm:p-4 bg-amber-100 rounded-full mb-4">
                    <CheckCircle2 className="text-amber-600 w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black">¡Evaluación Completada!</h2>
                  <p className="text-slate-500 text-sm">Resultados enviados a litasanchezromero@gmail.com</p>
                </div>

                <div className="flex justify-center gap-4 sm:gap-8 mb-8">
                  <div className="text-center">
                    <span className="block text-3xl sm:text-4xl font-black text-slate-900">{results.score}/10</span>
                    <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400">Puntaje</span>
                  </div>
                  <div className="w-px bg-slate-100" />
                  <div className="text-center">
                    <span className="block text-lg sm:text-xl font-black text-amber-600 mt-1 sm:mt-2">{results.level}</span>
                    <span className="text-[10px] sm:text-xs uppercase font-bold text-slate-400">Nivel de Logro</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl text-left mb-8">
                  <h4 className="font-bold mb-2 flex items-center gap-2"><ShieldCheck size={18}/> Perfil Ético Observado</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{results.profileDescription}</p>
                </div>

                <button 
                  onClick={handleDownloadDoc}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download size={20} />
                  Descargar Reporte .DOCX
                </button>
              </div>

               <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button 
                  onClick={() => setStep('home')}
                  className="text-slate-500 font-bold hover:text-slate-800 transition-colors"
                >
                  Volver al Inicio
                </button>
                <div className="hidden sm:block w-px h-4 bg-slate-300" />
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-slate-500 font-bold hover:text-red-600 transition-colors"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-12 p-8 text-center text-slate-400 text-xs border-t border-slate-200">
        <p>© 2026 Universidad de Atacama - Sede Vallenar</p>
        <p>Facultad Tecnológica | Ingeniería en Minas</p>
        <p className="mt-2 font-medium text-slate-500">Creado por: Adriana Sánchez R., Profesora de Ética, 2026.</p>
      </footer>
    </div>
  );
}
