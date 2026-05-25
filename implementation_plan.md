# Aulas/Apoio — Atividades linked to Presenças

A new section on `EditarAluno.tsx` to register **Aulas/Apoio sessions** (`Presenca` records with a date + summary), and optionally attach **Atividades** (activities with a description and a completed flag) to those sessions.

---

## Proposed Data Flow

```
Presenca
  ├── data       (date of the session)
  ├── sumario    (summary/description of the session)
  ├── presente   (attendance — defaults true for a session entry)
  ├── atividadeId? ──→ Atividades
                          ├── resumo   (what the activity was)
                          └── concluida (done or not)
```

A "session" is just a `Presenca` record where `sumario` is filled in. After creating one, the user can optionally attach an `Atividade` to it.

---

## Open Questions

> [!IMPORTANT]
> **Should sessions be separate from attendance records?**  
> Currently the `Presenca` model is used for both attendance (presente/falta) and sessions. We can re-use it since `atividadeId` is optional. Confirm if this is correct or if you want a clean split.

> [!NOTE]
> **Should an `Atividade` be standalone** (one activity shared across students) or **per-session** (one activity per presença)? Currently the schema links `Atividade → Presenca[]` (one-to-many), so one activity can have many presences. I'll implement it as **one activity per session** (create a new `Atividade` each time) unless you say otherwise.

---

## Proposed Changes

---

### Backend — `server.js`

#### [MODIFY] [server.js](file:///c:/Users/eduar/Documents/SPHelp/backend/server.js)

New API endpoints:

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/presenca` | **Update** existing handler to accept `sumario` and `atividadeId` fields |
| `PUT` | `/api/presenca/:id` | **Update** existing handler to accept `sumario` |
| `POST` | `/api/atividades` | Create a new `Atividade` (resumo + concluida) |
| `PUT` | `/api/atividades/:id` | Update an existing `Atividade` |
| `GET` | `/api/atividades/:id` | Get a single `Atividade` by id |
| `GET` | `/api/presenca/:alunoId` | **Update** to include `atividade` relation via `include` |

---

### Frontend — `EditarAluno.tsx`

#### [MODIFY] [EditarAluno.tsx](file:///c:/Users/eduar/Documents/SPHelp/src/assets/pages/App/EditarAluno.tsx)

Add a new **"Aulas / Apoio"** section in the **right column** (below or alongside MSAI), consisting of:

1. **Session list** — shows existing `Presenca` records that have a `sumario` filled in (or all, sorted newest first), including their linked `Atividade` if present.
2. **"+ Registar Aula/Apoio" button** — opens a form:
   - **Data** (`datetime-local` input)
   - **Sumário** (textarea — what happened in the session)
   - **Adicionar Atividade** toggle (optional):
     - **Resumo da atividade** (textarea)
     - **Concluída?** (checkbox)
3. On submit:
   - If activity details were filled → `POST /api/atividades` → get `atividadeId`
   - `POST /api/presenca` with `sumario`, `data`, `presente: true`, and optional `atividadeId`

Each session card in the list will show:
- Date
- Summary
- Activity badge (if linked): resumo + ✅/⏳ concluida status, with an **edit** button to update it

---

### CSS — `VerAluno.css`

#### [MODIFY] [VerAluno.css](file:///c:/Users/eduar/Documents/SPHelp/src/assets/pages/App/VerAluno.css)

Add styles for:
- `.aulas-section` — wrapper card matching the existing `.msai-section` style
- `.aula-card` — individual session card
- `.atividade-badge` — inline badge showing activity status
- `.aula-form` — form similar to `.falta-form`

---

## Verification Plan

### Automated
- Run `npx prisma migrate dev` (with a name like `add-sumario-default`) after schema confirms no drift — this was blocked earlier due to drift, which needs resolving with `prisma migrate reset` or `db push`.

### Manual
1. Start backend: `npm run dev` in `/backend`
2. Start frontend: `npm run dev` in root
3. Navigate to an aluno's edit page
4. Register a new session with a sumário and an activity
5. Verify the session appears in the list with the activity badge
6. Edit the activity, toggle `concluida`
7. Confirm data persists after page reload
