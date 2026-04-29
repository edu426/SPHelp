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
app.use(express.json({ limit: '10mb' })); // Increased limit to support base64 images

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

//-------------Criação de dados-------------
// POST criar novo aluno
app.post("/api/alunos", async (req, res) => {
  const { nome, turma, email, notas, professorId, foto } = req.body;

  if (!nome || !turma || !email || !notas || !professorId) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const aluno = await prisma.Alunos.create({
      data: { nome, turma, email, notas, professorId, foto },
    });
    res.status(201).json(aluno);
  } catch (error) {
    res.status(500).json({ error: "Erro ao criar aluno." });
  }
});

// POST registar nova presença
app.post("/api/presenca", async (req, res) => {
  const { alunoId, presente, justifica, data } = req.body;

  if (!alunoId || presente == null || justifica == null) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const registo = await prisma.Presenca.create({
      data: {
        alunoId,
        presente,
        justifica,
        ...(data ? { data: new Date(data) } : {}),
      },
    });
    res.status(201).json(registo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao registar presença." });
  }
});

//-------------Testes-------------
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

// GET 5 alunos editados mais recentemente
app.get("/api/alunos/recentes", async (req, res) => {
  try {
    const alunos = await prisma.Alunos.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
    });
    res.json(alunos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar alunos recentes." });
  }
});

//-------------Atualização de dados-------------
// PUT atualizar aluno pelo ID
// Chamado pelo EditarAluno.tsx quando o utilizador clica em "Guardar" depois de editar
app.put("/api/alunos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, turma, email, notas, foto } = req.body;

  // Validar os campos necessários
  if (!nome || !turma || !email) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    // Atualiza o aluno pelo ID
    const aluno = await prisma.Alunos.update({
      where: { id },
      data: { nome, turma, email, notas, foto },
    });

    // Retorna o aluno atualizado para o frontend
    res.json(aluno);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar aluno." });
  }
});




//-------------Busca de dados-------------
// GET um aluno pelo ID
// Chamado pelo EditarAluno.tsx na página de carregamento para buscar os detalhes completos de um único aluno
app.get("/api/alunos/detalhe/:id", async (req, res) => {
  // ID do aluno
  const { id } = req.params;
  try {
    // findUnique retorna o aluno que corresponde exatamente a este ID
    const aluno = await prisma.Alunos.findUnique({ where: { id } });
    if (!aluno) return res.status(404).json({ error: "Aluno não encontrado." });

    res.json(aluno);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar aluno." });
  }
});

// GET 3 alunos editados mais recentemente de um professor
app.get("/api/alunos/recentes/:professorId", async (req, res) => {
  const { professorId } = req.params;
  try {
    const alunos = await prisma.Alunos.findMany({
      where: { professorId },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
    res.json(alunos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar alunos recentes." });
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

// GET todas as presenças de um aluno
app.get("/api/presenca/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  try {
    const registos = await prisma.Presenca.findMany({
      where: { alunoId },
      orderBy: { data: "desc" }, // Mais recentes primeiro
    });
    res.json(registos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar presenças." });
  }
});

// PUT atualizar uma presença (ex: marcar como justificada)
app.put("/api/presenca/:id", async (req, res) => {
  const { id } = req.params;
  const { justifica } = req.body;

  if (justifica == null) {
    return res.status(400).json({ error: "Campo 'justifica' é obrigatório." });
  }

  try {
    const registo = await prisma.Presenca.update({
      where: { id },
      data: { justifica },
    });
    res.json(registo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar presença." });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT} e exposto à rede local (0.0.0.0)`);
});
