import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/shared/Navbar";
import Hero from "./components/landing/Hero";
import SubjectGrid from "./components/landing/SubjectGrid";
import DashboardPreview from "./components/landing/DashboardPreview";
import SuccessStats from "./components/landing/SuccessStats";
import TeamSection from "./components/landing/TeamSection";
import FaqSection from "./components/landing/FaqSection";
import Footer from "./components/shared/Footer";
import LoginModal from "./components/shared/LoginModal";
import StudentDashboard from "./components/student/StudentDashboard";
import AdminDashboard from "./components/admin/AdminDashboard";
import RetoCapitulo1 from "./components/student/RetoCapitulo1";
import RetoCapitulo2 from "./components/student/RetoCapitulo2";
import RetoCapitulo3 from "./components/student/RetoCapitulo3";
import RetoCapitulo4 from "./components/student/RetoCapitulo4";
import RetosSidebar from "./components/shared/RetosSidebar";
import GuardiaCapitulo from "./bloqueo/GuardiaCapitulo"; // BLOQUEO CAPÍTULOS

import { StudentRegistration, AssignedMaterial, HomeworkSubmission, QuizLog } from "./types";


export default function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [retosSidebarOpen, setRetosSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [role, setRole] = useState<"student" | "admin" | null>(null);

  // Ruta de retos
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (path.includes("capitulo-4") || hash.includes("capitulo-4") || search.includes("capitulo-4")) {
        return "/retos/capitulo-4";
      }
      if (path.includes("capitulo-3") || hash.includes("capitulo-3") || search.includes("capitulo-3")) {
        return "/retos/capitulo-3";
      }
      if (path.includes("capitulo-2") || hash.includes("capitulo-2") || search.includes("capitulo-2")) {
        return "/retos/capitulo-2";
      }
      if (path.includes("capitulo-1") || hash.includes("capitulo-1") || search.includes("capitulo-1")) {
        return "/retos/capitulo-1";
      }
    }
    return "/";
  });

  useEffect(() => {
    const handleRouteCheck = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      const search = window.location.search;
      if (path.includes("capitulo-4") || hash.includes("capitulo-4") || search.includes("capitulo-4")) {
        setCurrentRoute("/retos/capitulo-4");
      } else if (path.includes("capitulo-3") || hash.includes("capitulo-3") || search.includes("capitulo-3")) {
        setCurrentRoute("/retos/capitulo-3");
      } else if (path.includes("capitulo-2") || hash.includes("capitulo-2") || search.includes("capitulo-2")) {
        setCurrentRoute("/retos/capitulo-2");
      } else if (path.includes("capitulo-1") || hash.includes("capitulo-1") || search.includes("capitulo-1")) {
        setCurrentRoute("/retos/capitulo-1");
      } else {
        setCurrentRoute("/");
      }
    };
    window.addEventListener("popstate", handleRouteCheck);
    window.addEventListener("hashchange", handleRouteCheck);
    return () => {
      window.removeEventListener("popstate", handleRouteCheck);
      window.removeEventListener("hashchange", handleRouteCheck);
    };
  }, []);

  // Estados globales
  const [students, setStudents] = useState<StudentRegistration[]>([]);

  const [assignedMaterials, setAssignedMaterials] = useState<AssignedMaterial[]>([]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [quizScores, setQuizScores] = useState<QuizLog[]>([]);

  const lastSyncedStudents = useRef<StudentRegistration[]>([]);
  const lastSyncedMaterials = useRef<AssignedMaterial[]>([]);
  const lastSyncedSubmissions = useRef<HomeworkSubmission[]>([]);
  const lastSyncedQuizScores = useRef<QuizLog[]>([]);

  // Carga inicial de datos
  useEffect(() => {
    if (!user || !role) {
      setStudents([]);
      setAssignedMaterials([]);
      setSubmissions([]);
      setQuizScores([]);
      lastSyncedStudents.current = [];
      lastSyncedMaterials.current = [];
      lastSyncedSubmissions.current = [];
      lastSyncedQuizScores.current = [];
      return;
    }

    const loadData = async () => {
      try {
        if (role === "admin") {
          const studentsRes = await fetch("http://localhost:5000/api/students");
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
          lastSyncedStudents.current = studentsData;

          const materialsRes = await fetch("http://localhost:5000/api/materials");
          const materialsData = await materialsRes.json();
          setAssignedMaterials(materialsData);
          lastSyncedMaterials.current = materialsData;

          const submissionsRes = await fetch("http://localhost:5000/api/submissions");
          const submissionsData = await submissionsRes.json();
          setSubmissions(submissionsData);
          lastSyncedSubmissions.current = submissionsData;

          const quizzesRes = await fetch("http://localhost:5000/api/quizzes");
          const quizzesData = await quizzesRes.json();
          setQuizScores(quizzesData);
          lastSyncedQuizScores.current = quizzesData;
        } else {
          const studentsRes = await fetch(`http://localhost:5000/api/students?email=${user.email}`);
          const studentsData = await studentsRes.json();
          setStudents(studentsData);
          lastSyncedStudents.current = studentsData;

          if (studentsData.length > 0) {
            const studentId = studentsData[0].id;

            const materialsRes = await fetch(`http://localhost:5000/api/materials?studentId=${studentId}`);
            const materialsData = await materialsRes.json();
            setAssignedMaterials(materialsData);
            lastSyncedMaterials.current = materialsData;

            const submissionsRes = await fetch(`http://localhost:5000/api/submissions?studentId=${studentId}`);
            const submissionsData = await submissionsRes.json();
            setSubmissions(submissionsData);
            lastSyncedSubmissions.current = submissionsData;

            const quizzesRes = await fetch(`http://localhost:5000/api/quizzes?studentId=${studentId}`);
            const quizzesData = await quizzesRes.json();
            setQuizScores(quizzesData);
            lastSyncedQuizScores.current = quizzesData;
          }
        }
      } catch (err) {
        console.error("Error loading data from backend:", err);
      }
    };

    loadData();
  }, [user, role]);

  // Sincronizar estudiantes
  useEffect(() => {
    if (lastSyncedStudents.current.length === 0 && students.length === 0) return;

    students.forEach(async (student) => {
      const prev = lastSyncedStudents.current.find(s => s.id === student.id);
      if (!prev) {
        try {
          await fetch("http://localhost:5000/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(student)
          });
        } catch (err) {
          console.error("Error creating student:", err);
        }
      } else if (JSON.stringify(prev) !== JSON.stringify(student)) {
        try {
          await fetch(`http://localhost:5000/api/students/${student.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(student)
          });
        } catch (err) {
          console.error("Error updating student:", err);
        }
      }
    });

    lastSyncedStudents.current = students;
  }, [students]);

  // Sincronizar materiales
  useEffect(() => {
    if (lastSyncedMaterials.current.length === 0 && assignedMaterials.length === 0) return;

    assignedMaterials.forEach(async (mat) => {
      const prev = lastSyncedMaterials.current.find(m => m.id === mat.id);
      if (!prev) {
        try {
          await fetch("http://localhost:5000/api/materials", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mat)
          });
        } catch (err) {
          console.error("Error creating material:", err);
        }
      } else if (JSON.stringify(prev) !== JSON.stringify(mat)) {
        try {
          await fetch(`http://localhost:5000/api/materials/${mat.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mat)
          });
        } catch (err) {
          console.error("Error updating material:", err);
        }
      }
    });

    lastSyncedMaterials.current.forEach(async (prev) => {
      const exists = assignedMaterials.find(m => m.id === prev.id);
      if (!exists) {
        try {
          await fetch(`http://localhost:5000/api/materials/${prev.id}`, {
            method: "DELETE"
          });
        } catch (err) {
          console.error("Error deleting material:", err);
        }
      }
    });

    lastSyncedMaterials.current = assignedMaterials;
  }, [assignedMaterials]);

  // Sincronizar entregas
  useEffect(() => {
    if (lastSyncedSubmissions.current.length === 0 && submissions.length === 0) return;

    submissions.forEach(async (sub) => {
      const prev = lastSyncedSubmissions.current.find(s => s.id === sub.id);
      if (!prev) {
        try {
          await fetch("http://localhost:5000/api/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub)
          });
        } catch (err) {
          console.error("Error creating submission:", err);
        }
      } else if (JSON.stringify(prev) !== JSON.stringify(sub)) {
        try {
          await fetch(`http://localhost:5000/api/submissions/${sub.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sub)
          });
        } catch (err) {
          console.error("Error updating submission:", err);
        }
      }
    });

    lastSyncedSubmissions.current = submissions;
  }, [submissions]);

  // Sincronizar quizzes
  useEffect(() => {
    if (lastSyncedQuizScores.current.length === 0 && quizScores.length === 0) return;

    quizScores.forEach(async (q) => {
      const prev = lastSyncedQuizScores.current.find(item => item.id === q.id);
      if (!prev) {
        try {
          await fetch("http://localhost:5000/api/quizzes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(q)
          });
        } catch (err) {
          console.error("Error logging quiz score:", err);
        }
      }
    });

    lastSyncedQuizScores.current = quizScores;
  }, [quizScores]);

  const handleLoginSuccess = (email: string, userRole: "student" | "admin") => {
    setUser({ email });
    setRole(userRole);
    localStorage.setItem("tortumath_user", email);
    localStorage.setItem("tortumath_role", userRole);
  };

  const handleLogout = () => {
    setUser(null);
    setRole(null);
    localStorage.removeItem("tortumath_user");
    localStorage.removeItem("tortumath_role");
  };

  // BLOQUEO CAPÍTULOS
  const salirDeReto = (n: number) => {
    if (window.location.hash.includes(`capitulo-${n}`)) {
      window.location.hash = "";
    } else {
      window.history.pushState({}, "", "/");
    }
    setCurrentRoute("/");
  };

  if (currentRoute === "/retos/capitulo-4") {
    const currentStudent = students.find(s => user && s.email.toLowerCase() === user.email.toLowerCase());
    return (
      <GuardiaCapitulo key={4} capitulo={4} onSalir={() => salirDeReto(4)}>
        {(reportar) => (
          <RetoCapitulo4
            onBack={() => {
              if (window.location.hash.includes("capitulo-4")) {
                window.location.hash = "";
              } else {
                window.history.pushState({}, "", "/");
              }
              setCurrentRoute("/");
            }}
            userEmail={user?.email || "sofia.ramos@gmail.com"}
            studentId={currentStudent?.id || "STU-001"}
            studentName={currentStudent?.name || "Sofía Ramos Ortiz"}
            onSuccessCompletion={() => {
              fetch("http://localhost:5000/api/quizzes")
                .then(res => res.json())
                .then(data => {
                  setQuizScores(data);
                  lastSyncedQuizScores.current = data;
                })
                .catch(() => { });
            }}
            onProgresoMisiones={reportar}
          />
        )}
      </GuardiaCapitulo>
    );
  }

  if (currentRoute === "/retos/capitulo-3") {
    const currentStudent = students.find(s => user && s.email.toLowerCase() === user.email.toLowerCase());
    return (
      <GuardiaCapitulo key={3} capitulo={3} onSalir={() => salirDeReto(3)}>
        {(reportar) => (
          <RetoCapitulo3
            onBack={() => {
              if (window.location.hash.includes("capitulo-3")) {
                window.location.hash = "";
              } else {
                window.history.pushState({}, "", "/");
              }
              setCurrentRoute("/");
            }}
            userEmail={user?.email || "sofia.ramos@gmail.com"}
            studentId={currentStudent?.id || "STU-001"}
            studentName={currentStudent?.name || "Sofía Ramos Ortiz"}
            onSuccessCompletion={() => {
              fetch("http://localhost:5000/api/quizzes")
                .then(res => res.json())
                .then(data => {
                  setQuizScores(data);
                  lastSyncedQuizScores.current = data;
                })
                .catch(() => { });
            }}
            onProgresoMisiones={reportar}
          />
        )}
      </GuardiaCapitulo>
    );
  }

  if (currentRoute === "/retos/capitulo-2") {
    const currentStudent = students.find(s => user && s.email.toLowerCase() === user.email.toLowerCase());
    return (
      <GuardiaCapitulo key={2} capitulo={2} onSalir={() => salirDeReto(2)}>
        {(reportar) => (
          <RetoCapitulo2
            onBack={() => {
              if (window.location.hash.includes("capitulo-2")) {
                window.location.hash = "";
              } else {
                window.history.pushState({}, "", "/");
              }
              setCurrentRoute("/");
            }}
            userEmail={user?.email || "sofia.ramos@gmail.com"}
            studentId={currentStudent?.id || "STU-001"}
            studentName={currentStudent?.name || "Sofía Ramos Ortiz"}
            onSuccessCompletion={() => {
              fetch("http://localhost:5000/api/quizzes")
                .then(res => res.json())
                .then(data => {
                  setQuizScores(data);
                  lastSyncedQuizScores.current = data;
                })
                .catch(() => { });
            }}
            onProgresoMisiones={reportar}
          />
        )}
      </GuardiaCapitulo>
    );
  }

  if (currentRoute === "/retos/capitulo-1") {
    const currentStudent = students.find(s => user && s.email.toLowerCase() === user.email.toLowerCase());
    return (
      <GuardiaCapitulo key={1} capitulo={1} onSalir={() => salirDeReto(1)}>
        {(reportar) => (
          <RetoCapitulo1
            onBack={() => {
              if (window.location.hash.includes("capitulo-1")) {
                window.location.hash = "";
              } else {
                window.history.pushState({}, "", "/");
              }
              setCurrentRoute("/");
            }}
            userEmail={user?.email || "sofia.ramos@gmail.com"}
            studentId={currentStudent?.id || "STU-001"}
            studentName={currentStudent?.name || "Sofía Ramos Ortiz"}
            onSuccessCompletion={() => {
              fetch("http://localhost:5000/api/quizzes")
                .then(res => res.json())
                .then(data => {
                  setQuizScores(data);
                  lastSyncedQuizScores.current = data;
                })
                .catch(() => { });
            }}
            onProgresoMisiones={reportar}
          />
        )}
      </GuardiaCapitulo>
    );
  }

  // Vistas por rol
  if (user && role === "student") {
    return (
      <StudentDashboard
        userEmail={user.email}
        onLogout={handleLogout}
        students={students}
        setStudents={setStudents}
        assignedMaterials={assignedMaterials}
        setAssignedMaterials={setAssignedMaterials}
        submissions={submissions}
        setSubmissions={setSubmissions}
        quizScores={quizScores}
        setQuizScores={setQuizScores}
        onOpenRetoBook={(cap = 1) => {
          const target = `/retos/capitulo-${cap}`;
          window.location.hash = target;
          setCurrentRoute(target);
        }}
      />
    );
  }


  if (user && role === "admin") {
    return (
      <AdminDashboard
        userEmail={user.email}
        onLogout={handleLogout}
        students={students}
        setStudents={setStudents}
        assignedMaterials={assignedMaterials}
        setAssignedMaterials={setAssignedMaterials}
        submissions={submissions}
        setSubmissions={setSubmissions}
        quizScores={quizScores}
        setQuizScores={setQuizScores}
      />
    );
  }

  return (
    <div className="font-sans min-h-screen bg-[#F8F9FA] text-[#1E293B] antialiased">
      {/* Navbar */}
      <Navbar 
        onOpenLogin={() => setLoginOpen(true)} 
        onOpenRetosSidebar={() => setRetosSidebarOpen(true)}
      />

      {/* Retos */}
      <RetosSidebar
        isOpen={retosSidebarOpen}
        onClose={() => setRetosSidebarOpen(false)}
        onSelectReto={(cap) => {
          const target = `/retos/capitulo-${cap}`;
          window.location.hash = target;
          setCurrentRoute(target);
        }}
      />

      {/* Hero */}
      <Hero />

      {/* Materias */}
      <SubjectGrid />

      {/* Vista previa */}
      <DashboardPreview />

      {/* Estadísticas */}
      <SuccessStats />

      {/* Equipo */}
      <TeamSection />

      {/* Preguntas frecuentes */}
      <FaqSection />

      {/* Footer */}
      <Footer />

      {/* Login */}
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}

