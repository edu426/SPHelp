import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();
const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

app.post("/api/sync", async (req, res) => {
  const { clerkId } = req.body;

  if (!clerkId) {
    return res.status(400).json({ error: "ClerkId é obrigatório" });
  }

  // Procura o utilizador na base de dados
  let user = await prisma.user.findUnique({ where: { clerkId } });

  // Se não existir, cria um novo
  if (!user) {
    user = await prisma.user.create({
      data: { clerkId},
    });
    console.log("Novo professor criado:", user.id);
  } else {
    console.log("Professor já existe:", user.id);
  }

  res.json(user);
});


app.get("/", (req, res) => {
  res.send("Servidor do SPHelp ativo");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr em http://localhost:${PORT}`);
});
