-- CreateTable
CREATE TABLE "Professor" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,

    CONSTRAINT "Professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alunos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "turma" TEXT NOT NULL,
    "professorId" TEXT NOT NULL,

    CONSTRAINT "Alunos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Professor_clerkId_key" ON "Professor"("clerkId");

-- AddForeignKey
ALTER TABLE "Alunos" ADD CONSTRAINT "Alunos_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Professor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
