import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config({
  path: "../.env"
});
const app = express();
const prisma = new PrismaClient();

// Verificar se a DATABASE_URL está definida
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não está definida no ficheiro .env");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

app.post("/api/sync", async (req, res) => {
  const { clerkId } = req.body;

  if (!clerkId) {
    return res.status(400).json({ error: "ClerkId é obrigatório" });
  }

  // Procura o utilizador na base de dados
  let Professor = await prisma.Professor.findUnique({ where: { clerkId } });

  // Se não existir, cria um novo
  if (!Professor) {
    Professor = await prisma.Professor.create({
      data: { clerkId },
    });
    console.log("Novo professor criado:", Professor.id);
  } else {
    console.log("Professor já existe:", Professor.id);
  }

  res.json(Professor);
});


// POST criar novo aluno
app.post("/api/alunos", async (req, res) => {
  const { nome, turma, email, notas, professorId } = req.body;

  if (!nome || !turma || !email || !notas || !professorId) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const aluno = await prisma.Alunos.create({
      data: { nome, turma, email, notas, professorId },
    });
    res.status(201).json(aluno);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar aluno." });
  }
});

// GET todos os alunos (para testes/admin)
app.get("/api/alunos", async (req, res) => {
  try {
    const alunos = await prisma.Alunos.findMany({
      include: { professor: true }
    });
    res.json(alunos);
  } catch (error) {
    console.error("Erro ao buscar alunos:", error);
    res.status(500).json({ error: "Erro ao buscar alunos" });
  }
});

// GET todos os alunos de um professor
app.get("/api/alunos/:professorId", async (req, res) => {
  const { professorId } = req.params;
  try {
    const alunos = await prisma.Alunos.findMany({
      where: { professorId }
    });
    res.json(alunos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar alunos do professor" });
  }
});

app.get("/", (req, res) => {
  res.send("Servidor do SPHelp ativo");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
