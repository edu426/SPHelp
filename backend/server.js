import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { fieldEncryptionExtension } from "prisma-field-encryption";
dotenv.config({
  path: "../.env"
});
const app = express();
const globalPrisma = new PrismaClient();
const prisma = globalPrisma.$extends(
  fieldEncryptionExtension()
);

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
  const { nome, turma, notas, professorId, foto, dataNasc, diretorTurma } = req.body;

  if (!nome || !turma || !notas || !professorId) {
    return res.status(400).json({ error: "Todos os campos obrigatórios não foram preenchidos." });
  }

  try {
    const aluno = await prisma.Alunos.create({
      data: {
        nome,
        turma,
        notas,
        professorId,
        foto,
        ...(dataNasc ? { dataNasc: new Date(dataNasc) } : {}),
        ...(diretorTurma ? { diretorTurma } : {}),
      },
    });
    res.status(201).json(aluno);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar aluno." });
  }
});

// POST registar nova presença ou sessão de aula/apoio
app.post("/api/presenca", async (req, res) => {
  const { alunoId, presente, justifica, justificacao, data, sumario, atividades } = req.body;

  if (!alunoId || presente == null) {
    return res.status(400).json({ error: "alunoId e presente são obrigatórios." });
  }

  // justifica obrigatório apenas quando não é sessão de apoio
  const isSession = sumario && sumario.trim();
  if (!isSession && justifica == null) {
    return res.status(400).json({ error: "Campo 'justifica' é obrigatório para registos de presença." });
  }

  // Exige justificação textual quando a falta é marcada como justificada
  if (!presente && justifica && (!justificacao || !justificacao.trim())) {
    return res.status(400).json({ error: "A justificação é obrigatória quando a falta é justificada." });
  }

  try {
    const registo = await prisma.Presenca.create({
      data: {
        alunoId,
        presente,
        justifica: justifica ?? false,
        justificacao: justifica && justificacao ? justificacao.trim() : null,
        ...(data ? { data: new Date(data) } : {}),
        ...(isSession ? { sumario: sumario.trim() } : {}),
        ...(atividades && atividades.length > 0 ? { atividades: { create: atividades } } : {}),
      },
      include: { atividades: true },
    });
    res.status(201).json(registo);
  } catch (error) {
    console.error("Erro ao registar presença:", error);
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
  const { nome, turma, notas, foto, dataNasc, diretorTurma } = req.body;

  // Validar os campos necessários
  if (!nome || !turma || !notas) {
    return res.status(400).json({ error: "Todos os campos principais são obrigatórios." });
  }

  try {
    // Atualiza o aluno pelo ID
    const aluno = await prisma.Alunos.update({
      where: { id },
      data: {
        nome,
        turma,
        notas,
        foto,
        ...(dataNasc ? { dataNasc: new Date(dataNasc) } : {}),
        ...(diretorTurma !== undefined ? { diretorTurma } : {}),
      },
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

// GET todas as presenças de um aluno (inclui atividade ligada)
app.get("/api/presenca/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  try {
    const registos = await prisma.Presenca.findMany({
      where: { alunoId },
      orderBy: { data: "desc" }, // Mais recentes primeiro
      include: { atividades: true },
    });
    res.json(registos);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar presenças." });
  }
});

// PUT atualizar uma presença (ex: marcar como justificada, atualizar sumário, ou ligar atividade)
app.put("/api/presenca/:id", async (req, res) => {
  const { id } = req.params;
  const { justifica, justificacao, sumario } = req.body;

  // At least one updatable field required
  if (justifica == null && sumario == null) {
    return res.status(400).json({ error: "Nenhum campo para atualizar." });
  }

  // Exige justificação textual quando se marca como justificada
  if (justifica && (!justificacao || !justificacao.trim())) {
    return res.status(400).json({ error: "A justificação é obrigatória quando a falta é justificada." });
  }

  try {
    const updateData = {};
    if (justifica != null) {
      updateData.justifica = justifica;
      updateData.justificacao = justifica && justificacao ? justificacao.trim() : null;
    }
    if (sumario != null) {
      updateData.sumario = sumario.trim();
    }

    const registo = await prisma.Presenca.update({
      where: { id },
      data: updateData,
      include: { atividades: true },
    });
    res.json(registo);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar presença." });
  }
});

//-------------Atividades-------------
// POST criar nova atividade
app.post("/api/atividades", async (req, res) => {
  const { resumo, concluida, presencaId } = req.body;
  if (!resumo || !resumo.trim()) {
    return res.status(400).json({ error: "O resumo da atividade é obrigatório." });
  }
  try {
    const atividade = await prisma.Atividades.create({
      data: {
        resumo: resumo.trim(),
        concluida: concluida ?? false,
        ...(presencaId ? { presencaId } : {})
      },
    });
    res.status(201).json(atividade);
  } catch (error) {
    console.error("Erro ao criar atividade:", error);
    res.status(500).json({ error: "Erro ao criar atividade." });
  }
});

// GET uma atividade pelo ID
app.get("/api/atividades/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const atividade = await prisma.Atividades.findUnique({ where: { id } });
    if (!atividade) return res.status(404).json({ error: "Atividade não encontrada." });
    res.json(atividade);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar atividade." });
  }
});

// PUT atualizar uma atividade
app.put("/api/atividades/:id", async (req, res) => {
  const { id } = req.params;
  const { resumo, concluida } = req.body;
  if (!resumo || !resumo.trim()) {
    return res.status(400).json({ error: "O resumo da atividade é obrigatório." });
  }
  try {
    const atividade = await prisma.Atividades.update({
      where: { id },
      data: {
        resumo: resumo.trim(),
        concluida: concluida ?? false,
      },
    });
    res.json(atividade);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar atividade." });
  }
});

// GET msai de um aluno
app.get("/api/msai/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  try {
    const msaiRecord = await prisma.MSAI.findFirst({
      where: { alunoId }
    });
    res.json(msaiRecord || { msai: "000000000000000" });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar MSAI." });
  }
});

// PUT atualizar msai de um aluno
app.put("/api/msai/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  const { msai } = req.body;

  if (!msai || msai.length !== 15) {
    return res.status(400).json({ error: "MSAI inválido." });
  }

  try {
    const existing = await prisma.MSAI.findFirst({
      where: { alunoId }
    });

    let record;
    if (existing) {
      record = await prisma.MSAI.update({
        where: { id: existing.id },
        data: { msai }
      });
    } else {
      record = await prisma.MSAI.create({
        data: { alunoId, msai }
      });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: "Erro ao atualizar MSAI." });
  }
});

// GET dashboard stats
app.get("/api/dashboard/:professorId", async (req, res) => {
  const { professorId } = req.params;
  try {
    const totalAlunos = await prisma.Alunos.count({
      where: { professorId },
    });

    const atividadesPendentes = await prisma.Atividades.count({
      where: {
        concluida: false,
        presenca: { aluno: { professorId } }
      }
    });

    const faltasPorJustificar = await prisma.Presenca.count({
      where: {
        presente: false,
        justifica: false,
        aluno: { professorId }
      }
    });

    const allMsai = await prisma.MSAI.findMany({
      where: { aluno: { professorId } }
    });

    let universais = 0;
    let seletivas = 0;
    let adicionais = 0;

    allMsai.forEach(record => {
      const msaiStr = record.msai;
      if (msaiStr.length === 15) {
        universais += msaiStr.substring(0, 5).split('').filter(c => c === '1').length;
        seletivas += msaiStr.substring(5, 10).split('').filter(c => c === '1').length;
        adicionais += msaiStr.substring(10, 15).split('').filter(c => c === '1').length;
      }
    });

    res.json({
      totalAlunos,
      atividadesPendentes,
      faltasPorJustificar,
      msai: { universais, seletivas, adicionais }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao carregar dashboard." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT} e exposto à rede local (0.0.0.0)`);
});
