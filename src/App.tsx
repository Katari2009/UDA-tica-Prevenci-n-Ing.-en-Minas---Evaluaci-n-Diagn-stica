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
    <div className="min-h-screen bg-mining-stone font-sans text-mining-dark topo-bg">
      {/* Navbar Industrial */}
      <nav className="bg-mining-dark text-white p-4 sticky top-0 z-50 border-b-2 border-mining-copper shadow-xl">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-mining-copper p-1.5 rounded-lg">
              <HardHat className="text-white" size={24} />
            </div>
            <div>
              <span className="font-display font-bold tracking-tight text-lg leading-none block">UDA VALLENAR</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-mining-copper font-bold">Ética en Ingeniería en Minas</span>
            </div>
          </div>
          {student && (
            <div className="flex items-center gap-6 text-sm">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                <User size={14} className="text-mining-copper" />
                <span className="font-medium opacity-90">{student.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep('home')}
                  className="hover:text-mining-copper transition-colors font-bold uppercase text-xs tracking-widest"
                >
                  Panel
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 bg-red-500/10 text-red-400 px-3 py-1 rounded-md hover:bg-red-500 hover:text-white transition-all font-bold text-xs uppercase tracking-widest"
                >
                  <LogOut size={12} />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 sm:p-8">
        <AnimatePresence mode="wait">
          {/* REGISTRO PROFESIONAL */}
          {step === 'register' && (
            <motion.div 
              key="register"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-md mx-auto mt-12"
            >
              <div className="bg-white p-8 rounded-2xl shadow-2xl border-t-4 border-mining-dark relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <ShieldCheck size={120} />
                </div>
                
                <div className="text-center mb-10 relative">
                  <div className="bg-mining-stone w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 industrial-border rotate-3">
                    <GraduationCap className="text-mining-dark w-10 h-10 -rotate-3" />
                  </div>
                  <h2 className="text-3xl font-bold text-mining-dark">Acceso Académico</h2>
                  <p className="text-slate-500 text-sm font-medium mt-1 uppercase tracking-widest">Módulo de Ética Profesional</p>
                </div>

                <form onSubmit={handleRegister} className="space-y-6 relative">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Identificación</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mining-safety transition-colors" />
                      <input 
                        name="name" 
                        type="text" 
                        placeholder="Nombre Completo"
                        className="w-full pl-12 pr-4 py-4 bg-mining-stone border-none rounded-xl focus:ring-2 focus:ring-mining-safety outline-none font-medium transition-all"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Credencial Digital</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-mining-safety transition-colors" />
                      <input 
                        name="email" 
                        type="email" 
                        placeholder="ejemplo@uda.cl"
                        className="w-full pl-12 pr-4 py-4 bg-mining-stone border-none rounded-xl focus:ring-2 focus:ring-mining-safety outline-none font-medium transition-all"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-red-500 text-xs font-bold flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100"
                    >
                      <AlertCircle size={14}/> {error}
                    </motion.p>
                  )}

                  <button className="btn-primary w-full py-4 text-lg shadow-lg shadow-mining-dark/20">
                    Iniciar Sesión
                    <ChevronRight size={20} />
                  </button>
                </form>
                
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    Universidad de Atacama | Facultad Tecnológica
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* HOME / DASHBOARD INDUSTRIAL */}
          {step === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10"
            >
              <section className="relative h-64 sm:h-80 rounded-[2rem] overflow-hidden shadow-2xl group">
                <img 
                  src="https://picsum.photos/seed/mining-industry/1200/800" 
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt="Minería Industrial"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-mining-dark via-mining-dark/60 to-transparent flex flex-col justify-center p-8 sm:p-12">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <span className="inline-block px-3 py-1 bg-mining-safety text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-md mb-4">
                      Área de Ingeniería
                    </span>
                    <h1 className="text-4xl sm:text-6xl font-black text-white mb-4 leading-none">
                      ÉTICA EN <br />
                      <span className="text-mining-copper">MINERÍA</span>
                    </h1>
                    <p className="text-slate-300 max-w-md text-sm sm:text-base leading-relaxed font-medium">
                      Formando líderes íntegros para la industria extractiva del futuro. Compromiso, seguridad y sostenibilidad.
                    </p>
                  </motion.div>
                </div>
                <div className="absolute bottom-0 right-0 p-8 hidden sm:block">
                  <div className="industrial-border p-4 rounded-xl bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center gap-3 text-white">
                      <ShieldCheck className="text-mining-safety" size={24} />
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Estado del Módulo</p>
                        <p className="font-display font-bold">ACTIVO 2026</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="grid md:grid-cols-2 gap-8">
                <motion.div 
                  whileHover={{ y: -5 }}
                  onClick={() => setStep('syllabus')}
                  className="mining-card p-8 cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-mining-stone rounded-bl-full -mr-16 -mt-16 transition-all group-hover:bg-mining-copper/10" />
                  <div className="relative">
                    <div className="bg-mining-stone w-14 h-14 rounded-xl flex items-center justify-center mb-6 industrial-border group-hover:border-mining-copper transition-colors">
                      <BookOpen className="text-mining-dark group-hover:text-mining-copper transition-colors" size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Programa Académico</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                      Consulte las unidades de aprendizaje, bibliografía y el sistema de evaluación oficial de la asignatura.
                    </p>
                    <div className="flex items-center gap-2 text-mining-copper font-bold text-xs uppercase tracking-widest">
                      <span>Ver detalles</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ y: -5 }}
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
                  className={`mining-card p-8 cursor-pointer group relative overflow-hidden ${
                    student?.email && localStorage.getItem(`attempt_${student.email}`) 
                    ? 'opacity-60 grayscale' 
                    : ''
                  }`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-mining-stone rounded-bl-full -mr-16 -mt-16 transition-all group-hover:bg-mining-safety/10" />
                  <div className="relative">
                    <div className="bg-mining-stone w-14 h-14 rounded-xl flex items-center justify-center mb-6 industrial-border group-hover:border-mining-safety transition-colors">
                      <ClipboardCheck className="text-mining-dark group-hover:text-mining-safety transition-colors" size={28} />
                    </div>
                    <h3 className="text-2xl font-bold mb-3">Evaluación Diagnóstica</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                      Módulo de validación de competencias éticas iniciales. Requisito obligatorio para el semestre.
                    </p>
                    
                    {student?.email && localStorage.getItem(`attempt_${student.email}`) ? (
                      <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <CheckCircle2 size={14} />
                        <span>Completado</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-mining-safety font-bold text-xs uppercase tracking-widest">
                        <span>Iniciar prueba</span>
                        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {attemptBlocked && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-mining-dark/95 flex items-center justify-center p-8 text-center z-10"
                      >
                        <div className="space-y-4">
                          <AlertCircle size={48} className="text-mining-safety mx-auto" />
                          <h4 className="text-white font-bold text-xl">Acceso Restringido</h4>
                          <p className="text-slate-400 text-sm">
                            El sistema ha detectado un envío previo para esta credencial. Solo se permite un intento por estudiante.
                          </p>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAttemptBlocked(false); }}
                            className="text-mining-safety text-xs font-black uppercase tracking-widest pt-2"
                          >
                            Entendido
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* SYLLABUS INDUSTRIAL */}
          {step === 'syllabus' && (
            <motion.div key="syllabus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setStep('home')} 
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl border border-slate-200 hover:border-mining-copper transition-colors"
                  >
                    <ChevronRight className="rotate-180 text-mining-dark"/>
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold">Programa Oficial</h2>
                    <p className="text-slate-500 text-sm font-medium">Asignatura: Ética Profesional</p>
                  </div>
                </div>
                <div className="hidden sm:block">
                  <span className="px-4 py-2 bg-mining-dark text-white rounded-lg text-xs font-black uppercase tracking-widest">
                    Código: MIN-2026
                  </span>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <div className="mining-card overflow-hidden">
                    <div className="p-6 bg-mining-dark text-white flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor size={20} className="text-mining-copper" />
                        <h3 className="font-bold text-lg">Descripción General</h3>
                      </div>
                    </div>
                    <div className="p-8">
                      <p className="text-slate-600 leading-relaxed italic border-l-4 border-mining-copper pl-6">
                        "Proporciona principios y valores éticos para guiar el comportamiento profesional; desarrolla reflexión crítica sobre acciones considerando implicancias morales y sociales en el contexto de la industria minera."
                      </p>
                    </div>
                  </div>

                  <div className="mining-card">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                      <Layers size={20} className="text-mining-safety" />
                      <h3 className="font-bold text-lg uppercase tracking-tight">Unidades de Aprendizaje</h3>
                    </div>
                    <div className="p-8 space-y-8">
                      {SYLLABUS.units.map((unit, i) => (
                        <div key={i} className="group">
                          <div className="flex items-start gap-4">
                            <span className="text-3xl font-black text-slate-100 group-hover:text-mining-stone transition-colors leading-none">0{i+1}</span>
                            <div>
                              <h4 className="font-bold text-mining-dark mb-2 group-hover:text-mining-copper transition-colors">{unit.title}</h4>
                              <p className="text-slate-500 text-sm leading-relaxed">{unit.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="mining-card">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                      <ClipboardCheck size={20} className="text-mining-safety" />
                      <h3 className="font-bold text-lg uppercase tracking-tight">Evaluación</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      {SYLLABUS.evaluation.map((evalItem, i) => (
                        <div key={i} className="p-4 bg-mining-stone rounded-xl border border-transparent hover:border-mining-copper/20 transition-all">
                          <h4 className="font-bold text-xs uppercase tracking-widest text-mining-dark mb-1">{evalItem.title}</h4>
                          <p className="text-slate-500 text-[11px] leading-tight">{evalItem.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mining-card">
                    <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                      <Library size={20} className="text-mining-safety" />
                      <h3 className="font-bold text-lg uppercase tracking-tight">Bibliografía</h3>
                    </div>
                    <div className="p-6 space-y-6">
                      <div>
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Obligatoria</h5>
                        <ul className="space-y-3">
                          {SYLLABUS.bibliography.obligatory.map((book, i) => (
                            <li key={i} className="text-[11px] text-slate-600 flex gap-2 leading-relaxed">
                              <span className="text-mining-copper font-bold">•</span>
                              {book}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* EVALUACIÓN INDUSTRIAL */}
          {step === 'eval' && (
            <motion.div key="eval" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-mining-dark text-white rounded-xl flex items-center justify-center font-black text-xl border-b-4 border-mining-safety">
                    {currentQuestion + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-none">Pregunta en Curso</h3>
                    <p className="text-slate-400 text-xs uppercase tracking-widest font-bold mt-1">Avance: {Math.round(((currentQuestion + 1) / QUESTIONS.length) * 100)}%</p>
                  </div>
                </div>
                <div className="w-full sm:w-48 h-3 bg-slate-200 rounded-full overflow-hidden industrial-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentQuestion + 1) / QUESTIONS.length) * 100}%` }}
                    className="h-full bg-mining-safety" 
                  />
                </div>
              </div>

              <div className="mining-card p-8 sm:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <HardHat size={120} />
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-bold mb-10 leading-tight relative">{QUESTIONS[currentQuestion].text}</h3>

                <div className="space-y-4 relative">
                  {QUESTIONS[currentQuestion].type === 'choice' && QUESTIONS[currentQuestion].options?.map((opt) => (
                    <button
                      key={opt.id}
                      disabled={showFeedback}
                      onClick={() => handleAnswer(opt.id)}
                      className={`w-full text-left p-5 rounded-xl border-2 transition-all flex justify-between items-center gap-4 group ${
                        answers[QUESTIONS[currentQuestion].id] === opt.id
                          ? opt.id === QUESTIONS[currentQuestion].correctAnswer 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-red-500 bg-red-50'
                          : 'border-mining-stone hover:border-mining-copper/40 hover:bg-mining-stone transition-all'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm transition-colors ${
                          answers[QUESTIONS[currentQuestion].id] === opt.id ? 'bg-white' : 'bg-mining-stone group-hover:bg-white'
                        }`}>
                          {opt.id.toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-700">{opt.text}</span>
                      </div>
                      {showFeedback && opt.id === QUESTIONS[currentQuestion].correctAnswer && <CheckCircle2 className="text-green-500 shrink-0" />}
                    </button>
                  ))}

                  {QUESTIONS[currentQuestion].type === 'scale' && (
                    <div className="space-y-8 py-4">
                      <div className="relative pt-6">
                        <input 
                          type="range" min="1" max="10" 
                          className="w-full h-3 bg-mining-stone rounded-full appearance-none cursor-pointer accent-mining-safety border border-slate-200"
                          onChange={(e) => setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestion].id]: e.target.value }))}
                        />
                        <div className="flex justify-between mt-4">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">1 - Crítico</span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">10 - Óptimo</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-mining-dark text-white flex items-center justify-center text-4xl font-black border-b-4 border-mining-copper">
                          {answers[QUESTIONS[currentQuestion].id] || 5}
                        </div>
                        <button 
                          onClick={() => handleAnswer(answers[QUESTIONS[currentQuestion].id] || 5)}
                          className="btn-primary"
                        >
                          Confirmar Valor
                        </button>
                      </div>
                    </div>
                  )}

                  {QUESTIONS[currentQuestion].type === 'open' && (
                    <div className="space-y-6">
                      <textarea 
                        className="w-full p-6 bg-mining-stone border-none rounded-2xl h-48 outline-none focus:ring-2 focus:ring-mining-copper font-medium transition-all"
                        placeholder="Desarrolle su respuesta considerando criterios técnicos y éticos..."
                        onChange={(e) => setAnswers(prev => ({ ...prev, [QUESTIONS[currentQuestion].id]: e.target.value }))}
                      />
                      <button 
                        onClick={() => handleAnswer(answers[QUESTIONS[currentQuestion].id])}
                        className="btn-primary w-full py-4"
                      >
                        Finalizar Evaluación
                      </button>
                    </div>
                  )}
                </div>

                {showFeedback && QUESTIONS[currentQuestion].type === 'choice' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-10 p-6 rounded-2xl flex gap-4 border-l-4 ${
                      answers[QUESTIONS[currentQuestion].id] === QUESTIONS[currentQuestion].correctAnswer 
                        ? 'bg-green-50 border-green-500 text-green-900' 
                        : 'bg-red-50 border-red-500 text-red-900'
                    }`}
                  >
                    <div className="shrink-0 mt-1">
                      {answers[QUESTIONS[currentQuestion].id] === QUESTIONS[currentQuestion].correctAnswer 
                        ? <CheckCircle2 size={20} /> 
                        : <AlertCircle size={20} />
                      }
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase tracking-widest mb-1">Retroalimentación Técnica</p>
                      <p className="text-sm leading-relaxed opacity-80">{QUESTIONS[currentQuestion].feedback}</p>
                    </div>
                  </motion.div>
                )}

                {showFeedback && (
                  <motion.button 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={nextQuestion}
                    className="mt-10 w-full btn-primary py-5 bg-mining-copper hover:bg-mining-dark shadow-xl"
                  >
                    {currentQuestion < QUESTIONS.length - 1 ? "Siguiente Pregunta" : "Generar Resultados Finales"}
                    <ChevronRight />
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}

          {/* RESULTADOS INDUSTRIALES */}
          {step === 'results' && results && (
            <motion.div key="results" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto space-y-8">
              <div className="mining-card p-10 sm:p-16 text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-mining-copper" />
                
                <div className="mb-10">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-mining-stone rounded-3xl mb-6 industrial-border rotate-6">
                    <CheckCircle2 className="text-mining-accent w-12 h-12 -rotate-6" />
                  </div>
                  <h2 className="text-4xl font-black text-mining-dark mb-2">Evaluación Finalizada</h2>
                  <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Reporte de Competencias Éticas v1.0</p>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                  <div className="bg-mining-stone p-6 rounded-2xl border-b-4 border-mining-dark">
                    <span className="block text-5xl font-black text-mining-dark">{results.score}<span className="text-xl opacity-30">/10</span></span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 mt-2 block">Puntaje Obtenido</span>
                  </div>
                  <div className="bg-mining-stone p-6 rounded-2xl border-b-4 border-mining-copper">
                    <span className="block text-lg font-black text-mining-copper leading-tight mb-1">{results.level}</span>
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 block">Nivel de Logro</span>
                  </div>
                </div>

                <div className="bg-mining-dark text-white p-8 rounded-2xl text-left mb-10 relative group">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck size={64} />
                  </div>
                  <h4 className="font-black text-xs uppercase tracking-[0.3em] text-mining-copper mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-mining-copper rounded-full animate-pulse" />
                    Perfil Ético Profesional
                  </h4>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                    {results.profileDescription}
                  </p>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleDownloadDoc}
                    className="btn-primary w-full py-5 text-lg shadow-2xl shadow-mining-dark/30"
                  >
                    <Download size={22} />
                    Descargar Certificado Oficial (.DOCX)
                  </button>
                  
                  <button 
                    onClick={() => setStep('home')}
                    className="btn-outline w-full py-4"
                  >
                    Finalizar y Volver al Panel
                  </button>
                </div>
                
                <p className="mt-10 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  Copia de seguridad enviada a: <span className="text-mining-dark">litasanchezromero@gmail.com</span>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-20 p-12 text-center border-t border-slate-200 bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3 opacity-40 grayscale">
              <div className="w-8 h-8 bg-mining-dark rounded-lg" />
              <div className="w-8 h-8 bg-mining-copper rounded-lg" />
              <div className="w-8 h-8 bg-mining-safety rounded-lg" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em]">Universidad de Atacama - Sede Vallenar</p>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Facultad Tecnológica | Ingeniería en Minas</p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 w-full max-w-xs">
              <p className="text-slate-400 text-[10px] italic">Diseñado para la formación ética de profesionales de la minería.</p>
              <p className="mt-2 font-bold text-slate-500 text-[10px] uppercase tracking-widest">© 2026 Profesora Adriana Sánchez R.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
