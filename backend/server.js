import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
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
  const { clerkId, email, firstName } = req.body;

  if (!clerkId) {
    return res.status(400).json({ error: "ClerkId é obrigatório" });
  }

  // Procura o utilizador na base de dados
  let Professor = await prisma.Professor.findUnique({ where: { clerkId } });

  // Se não existir, cria um novo e envia email de boas-vindas
  if (!Professor) {
    Professor = await prisma.Professor.create({
      data: { clerkId },
    });
    console.log("Novo professor criado:", Professor.id);

    // Enviar email de boas-vindas (apenas se tivermos o email e as variáveis configuradas)
    if (email && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        await transporter.sendMail({
          from: `"Inclui+" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "Bem-vindo ao Inclui+! 🎉",
          html: `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
              <div style="background: #1a1a1a; padding: 32px; text-align: center;">
                <h1 style="color: #f4d77e; margin: 0; font-size: 2rem; letter-spacing: -0.5px;">Inclui+</h1>
                <p style="color: #aaa; margin: 8px 0 0 0; font-size: 0.9rem;">Gestão de Apoio Educativo</p>
              </div>
              <div style="padding: 40px 32px;">
                <h2 style="color: #1a1a1a; margin: 0 0 12px 0; font-size: 1.5rem;">Olá, ${firstName}!</h2>
                <p style="color: #555; line-height: 1.7; margin: 0 0 24px 0;">
                  Bem-vindo ao <strong>Inclui+</strong>! A tua conta foi criada com sucesso. Estamos muito contentes por teres escolhido a nossa plataforma para apoiar o teu trabalho.
                </p>
                <div style="background: #f9fafb; border-radius: 10px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f4d77e;">
                  <p style="margin: 0 0 12px 0; color: #444; font-weight: 600;">O que podes fazer com o Inclui+:</p>
                  <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 2;">
                    <li>Gerir fichas detalhadas de cada aluno</li>
                    <li>Registar presenças e justificar faltas</li>
                    <li>Definir Medidas de Suporte (MSAI)</li>
                    <li>Exportar relatórios para Excel</li>
                  </ul>
                </div>
              </div>
              <div style="background: #f9fafb; padding: 20px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
              </div>
            </div>
          `,
        });

        console.log("Email de boas-vindas enviado para:", email);
      } catch (emailErr) {
        // Não falhar o sync se o email falhar — apenas registar o erro
        console.error("Erro ao enviar email de boas-vindas:", emailErr);
      }
    }
  } else {
    console.log("Professor já existe:", Professor.id);
  }

  res.json(Professor);
});

//-------------Criação de dados-------------
// POST criar novo aluno
app.post("/api/alunos", async (req, res) => {
  const { nome, turma, notas, estrategias, professorId, foto, dataNasc, diretorTurma, encarregado } = req.body;

  if (!nome || !turma || !professorId || !dataNasc || !diretorTurma) {
    return res.status(400).json({ error: "Todos os campos obrigatórios não foram preenchidos." });
  }

  try {
    const aluno = await prisma.Alunos.create({
      data: {
        nome,
        turma,
        notas: notas || "",
        ...(estrategias !== undefined ? { estrategias } : {}),
        professorId,
        foto,
        dataNasc: new Date(dataNasc),
        diretorTurma,
        ...(encarregado && encarregado.nome ? {
          Encaregado: {
            create: encarregado
          }
        } : {}),
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
  const { nome, turma, notas, estrategias, foto, dataNasc, diretorTurma, encarregado } = req.body;

  // Validar os campos necessários
  if (!nome || !turma || !dataNasc || !diretorTurma) {
    return res.status(400).json({ error: "Todos os campos principais são obrigatórios." });
  }

  try {
    // Atualiza o aluno pelo ID
    const aluno = await prisma.Alunos.update({
      where: { id },
      data: {
        nome,
        turma,
        notas: notas || "",
        ...(estrategias !== undefined ? { estrategias } : {}),
        foto,
        dataNasc: new Date(dataNasc),
        diretorTurma,
        ...(encarregado ? {
          Encaregado: {
            deleteMany: {},
            ...(encarregado.nome ? { create: encarregado } : {})
          }
        } : {}),
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
    const aluno = await prisma.Alunos.findUnique({ 
        where: { id },
        include: { Encaregado: true }
    });
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

// GET terapias de um aluno
app.get("/api/terapias/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  try {
    const record = await prisma.Terapias.findUnique({ where: { alunoId } });
    res.json(record || {
      fisioterapia: false,
      terapiaFala: false,
      terapiaOcupacional: false,
      psicologia: false,
      outros: false,
      outrosDescricao: null,
      notasTerapia: null,
    });
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar terapias." });
  }
});

// PUT atualizar (ou criar) terapias de um aluno
app.put("/api/terapias/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  const { fisioterapia, terapiaFala, terapiaOcupacional, psicologia, outros, outrosDescricao, notasTerapia } = req.body;

  try {
    const record = await prisma.Terapias.upsert({
      where: { alunoId },
      update: {
        fisioterapia: fisioterapia ?? false,
        terapiaFala: terapiaFala ?? false,
        terapiaOcupacional: terapiaOcupacional ?? false,
        psicologia: psicologia ?? false,
        outros: outros ?? false,
        outrosDescricao: outros ? (outrosDescricao || null) : null,
        notasTerapia: notasTerapia || null,
      },
      create: {
        alunoId,
        fisioterapia: fisioterapia ?? false,
        terapiaFala: terapiaFala ?? false,
        terapiaOcupacional: terapiaOcupacional ?? false,
        psicologia: psicologia ?? false,
        outros: outros ?? false,
        outrosDescricao: outros ? (outrosDescricao || null) : null,
        notasTerapia: notasTerapia || null,
      },
    });
    res.json(record);
  } catch (error) {
    console.error("Erro ao atualizar terapias:", error);
    res.status(500).json({ error: "Erro ao atualizar terapias." });
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

// POST enviar mensagem de suporte por email
app.post("/api/suporte", async (req, res) => {
  const { emailRemetente, assunto, mensagem } = req.body;

  if (!emailRemetente || !assunto || !mensagem) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  // Validação básica do email do remetente
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailRemetente)) {
    return res.status(400).json({ error: "Email de contacto inválido." });
  }

  // Verificar se as variáveis de ambiente estão configuradas
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || !process.env.ADMIN_EMAIL) {
    console.error("Variáveis de email não configuradas no .env");
    return res.status(500).json({ error: "Serviço de email não configurado. Contacta o administrador." });
  }

  try {
    // Configurar o transporter do Nodemailer com Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const dataFormatada = new Date().toLocaleString("pt-PT", {
      timeZone: "Europe/Lisbon",
      dateStyle: "full",
      timeStyle: "short",
    });

    // Enviar o email para o admin
    await transporter.sendMail({
      from: `"Inclui+ Suporte" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      replyTo: emailRemetente,
      subject: `[Inclui+ Suporte] ${assunto}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
          <div style="background: #1a1a1a; padding: 24px 32px;">
            <h1 style="color: #f4d77e; margin: 0; font-size: 1.4rem;">Nova Mensagem de Suporte</h1>
            <p style="color: #aaa; margin: 6px 0 0 0; font-size: 0.9rem;">Inclui+ — Central de Ajuda</p>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 10px 0; color: #666; font-size: 0.85rem; width: 120px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">De</td>
                <td style="padding: 10px 0; color: #1a1a1a; font-weight: 600;">${emailRemetente}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #666; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Assunto</td>
                <td style="padding: 10px 0; color: #1a1a1a;">${assunto}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 10px 0; color: #666; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Data</td>
                <td style="padding: 10px 0; color: #1a1a1a;">${dataFormatada}</td>
              </tr>
            </table>
            <div style="background: #f9fafb; border-radius: 10px; padding: 20px; border-left: 4px solid #f4d77e;">
              <p style="margin: 0; color: #666; font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Mensagem</p>
              <p style="margin: 0; color: #1a1a1a; line-height: 1.7; white-space: pre-wrap;">${mensagem}</p>
            </div>
          </div>
          <div style="background: #f9fafb; padding: 16px 32px; border-top: 1px solid #f3f4f6;">
            <p style="margin: 0; color: #aaa; font-size: 0.8rem; text-align: center;">Este email foi enviado automaticamente pelo sistema Inclui+.</p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: "Mensagem enviada com sucesso!" });
  } catch (error) {
    console.error("Erro ao enviar email de suporte:", error);
    res.status(500).json({ error: "Erro ao enviar mensagem. Tenta novamente mais tarde." });
  }
});

// DELETE um aluno pelo ID
app.delete("/api/alunos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const aluno = await prisma.Alunos.delete({ where: { id } });
    res.json({ message: "Aluno eliminado com sucesso." });
  } catch (error) {
    console.error("Erro ao eliminar aluno:", error);
    res.status(500).json({ error: "Erro ao eliminar aluno." });
  }
});

// GET Adaptacoes de um aluno
app.get("/api/adaptacoes/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  try {
    const adaptacoes = await prisma.Adaptacoes.findFirst({ where: { alunoId } });
    if (!adaptacoes) {
      return res.json({ adaptacao: "00000000000", outros: "", observacoes: "" });
    }
    res.json(adaptacoes);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar adaptacoes." });
  }
});

// PUT (upsert) Adaptacoes de um aluno
app.put("/api/adaptacoes/:alunoId", async (req, res) => {
  const { alunoId } = req.params;
  const { adaptacao, outros, observacoes } = req.body;
  try {
    const existing = await prisma.Adaptacoes.findFirst({ where: { alunoId } });
    let updated;
    if (existing) {
      updated = await prisma.Adaptacoes.update({
        where: { id: existing.id },
        data: { adaptacao, outros, observacoes }
      });
    } else {
      updated = await prisma.Adaptacoes.create({
        data: { alunoId, adaptacao, outros, observacoes }
      });
    }
    res.json(updated);
  } catch (error) {
    console.error("Erro ao guardar adaptacoes:", error);
    res.status(500).json({ error: "Erro ao guardar adaptacoes." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor a correr na porta ${PORT} e exposto à rede local (0.0.0.0)`);
});
