import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './ExportarAluno.css';
import IsLoggedIn from '../../functions/IsLoggedIn';
import { useUser } from '@clerk/clerk-react';

// ── Types ────────────────────────────────────────────────────────────────────

interface Student {
    id: string;
    nome: string;
    turma: string;
    notas: string;
    professorId: string;
    diretorTurma: string;
    foto?: string;
    Encaregado?: any[];
}

interface Atividade {
    id: string;
    resumo: string;
    concluida: boolean;
}

interface TerapiasData {
    fisioterapia: boolean;
    terapiaFala: boolean;
    terapiaOcupacional: boolean;
    psicologia: boolean;
    outros: boolean;
    outrosDescricao: string | null;
    notasTerapia: string | null;
}

interface Presenca {
    id: string;
    alunoId: string;
    data: string;
    presente: boolean;
    justifica: boolean;
    justificacao?: string | null;
    sumario?: string | null;
    atividades?: Atividade[];
}

// Labels for each MSAI bit (index 0–14)
const MSAI_LABELS: string[] = [
    // Universais (0–4)
    'Diferenciação pedagógica',
    'Acomodações curriculares',
    'O enriquecimento curricular',
    'A promoção do comportamento pró-social',
    'A intervenção com foco académico ou comportamental em pequenos grupos',
    // Seletivas (5–9)
    'Os percursos curriculares diferenciados',
    'As adaptações curriculares não significativas',
    'Apoio psicopedagógico',
    'A antecipação e o reforço das aprendizagens',
    'O apoio tutorial',
    // Adicionais (10–14)
    'A frequência do ano de escolaridade por disciplinas',
    'As adaptações curriculares significativas',
    'O plano individual de transição',
    'O desenvolvimento de metodologias e estratégias de ensino estruturado',
    'O desenvolvimento de competências de autonomia pessoal e social',
];

const MSAI_CATEGORIES = [
    { label: 'Medidas Universais', indices: [0, 1, 2, 3, 4] },
    { label: 'Medidas Seletivas', indices: [5, 6, 7, 8, 9] },
    { label: 'Medidas Adicionais', indices: [10, 11, 12, 13, 14] },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

// ── Component ────────────────────────────────────────────────────────────────

export default function ExportarAluno() {
    const { id } = useParams<{ id: string }>();
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);
    const navigate = useNavigate();
    // Data
    const [aluno, setAluno] = useState<Student | null>(null);
    const [presencas, setPresencas] = useState<Presenca[]>([]);
    const [msai, setMsai] = useState<string>('000000000000000');
    const [terapias, setTerapias] = useState<TerapiasData | null>(null);
    const [adaptacoes, setAdaptacoes] = useState<{ adaptacao: string; outros: string; observacoes: string } | null>(null);
    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Which sections to export
    const [exportSections, setExportSections] = useState({
        dadosPessoais: true,
        encarregado: true,
        presencas: true,
        msai: true,
        adaptacoes: true,
        terapias: true,
    });

    // ── Fetch ─────────────────────────────────────────────────────────────────

    useEffect(() => {
        if (user) {
            fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ clerkId: user.id }),
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log("Sincronizado com sucesso:", data);
                    setProfessorId(data.id);
                })
                .catch((err) => {
                    console.error("Erro ao sincronizar:", err);
                });
        }
    }, [user]);


    useEffect(() => {
        if (!id) return;

        const fetchAll = async () => {
            setLoading(true);
            try {
                // Student
                const alunoRes = await fetch(`/api/alunos/detalhe/${id}`);
                if (!alunoRes.ok) throw new Error('Aluno não encontrado.');
                const alunoData: Student = await alunoRes.json();
                setAluno(alunoData);

                // Presences
                const presRes = await fetch(`/api/presenca/${id}`);
                if (presRes.ok) {
                    const presData: Presenca[] = await presRes.json();
                    setPresencas(presData);
                }

                // MSAI
                const msaiRes = await fetch(`/api/msai/${id}`);
                if (msaiRes.ok) {
                    const msaiData = await msaiRes.json();
                    if (msaiData?.msai) setMsai(msaiData.msai);
                }

                // Adaptacoes
                const adaptacoesRes = await fetch(`/api/adaptacoes/${id}`);
                if (adaptacoesRes.ok) {
                    const adaptacoesData = await adaptacoesRes.json();
                    setAdaptacoes(adaptacoesData);
                }

                // Terapias
                const terapiasRes = await fetch(`/api/terapias/${id}`);
                if (terapiasRes.ok) {
                    const terapiasData = await terapiasRes.json();
                    setTerapias(terapiasData);
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados.');
            } finally {
                setLoading(false);
            }
        };

        fetchAll();
    }, [id]);

    // ── Toggle helpers ────────────────────────────────────────────────────────

    const toggleSection = (key: keyof typeof exportSections) =>
        setExportSections(prev => ({ ...prev, [key]: !prev[key] }));

    // ── Export ────────────────────────────────────────────────────────────────

    const handleExport = () => {
        if (!aluno) return;
        if (!exportSections.dadosPessoais && !exportSections.encarregado && !exportSections.presencas && !exportSections.msai && !exportSections.adaptacoes && !exportSections.terapias) {
            setMessage('Selecione pelo menos uma secção para exportar.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        try {
            const wb = XLSX.utils.book_new();

            // ── Sheet 1: Dados Pessoais ──
            if (exportSections.dadosPessoais) {
                const dadosRows = [
                    { Campo: 'Nome', Valor: aluno.nome },
                    { Campo: 'Turma', Valor: aluno.turma },
                    { Campo: 'Diretor de Turma', Valor: aluno.diretorTurma || 'N/A' },
                    { Campo: 'Diagnóstico / Notas', Valor: aluno.notas || '' },
                ];
                const wsDados = XLSX.utils.json_to_sheet(dadosRows);
                wsDados['!cols'] = [{ wch: 20 }, { wch: 40 }];
                XLSX.utils.book_append_sheet(wb, wsDados, 'Dados Pessoais');
            }

            // ── Sheet 1.5: Encarregado ──
            if (exportSections.encarregado) {
                const enc = aluno.Encaregado && aluno.Encaregado.length > 0 ? aluno.Encaregado[0] : null;
                const encRows = enc ? [
                    { Campo: 'Nome', Valor: enc.nome || 'N/A' },
                    { Campo: 'Parentesco', Valor: enc.tipo || 'N/A' },
                    { Campo: 'Email', Valor: enc.email || 'N/A' },
                    { Campo: 'Telefone', Valor: enc.telefone || 'N/A' },
                ] : [
                    { Campo: 'Aviso', Valor: 'Sem encarregado de educação registado.' }
                ];
                const wsEnc = XLSX.utils.json_to_sheet(encRows);
                wsEnc['!cols'] = [{ wch: 20 }, { wch: 40 }];
                XLSX.utils.book_append_sheet(wb, wsEnc, 'Encarregado');
            }

            // ── Sheet 2: Aulas e Apoio ──
            if (exportSections.presencas) {
                if (presencas.length === 0) {
                    const wsEmpty = XLSX.utils.json_to_sheet([{ Info: 'Sem registos de aulas ou apoio.' }]);
                    wsEmpty['!cols'] = [{ wch: 40 }];
                    XLSX.utils.book_append_sheet(wb, wsEmpty, 'Aulas e Apoio');
                } else {
                    const presRows = presencas.map(p => ({
                        'Data': formatDate(p.data),
                        'Estado': p.presente ? 'Presente' : 'Falta',
                        'Justificada': !p.presente ? (p.justifica ? 'Sim' : 'Não') : '—',
                        'Justificação': p.justificacao || '—',
                        'Sumário': p.sumario || '—',
                        'Atividades': p.atividades && p.atividades.length > 0
                            ? p.atividades.map(a => `${a.resumo} (${a.concluida ? 'Concluída' : 'Pendente'})`).join(' | ')
                            : '—',
                    }));
                    const wsPresencas = XLSX.utils.json_to_sheet(presRows);
                    wsPresencas['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 40 }, { wch: 15 }];
                    XLSX.utils.book_append_sheet(wb, wsPresencas, 'Aulas e Apoio');
                }
            }

            // ── Sheet 3: MSAI ──
            if (exportSections.msai) {
                const msaiRows: { Categoria: string; Medida: string; Ativa: string }[] = [];
                MSAI_CATEGORIES.forEach(cat => {
                    cat.indices.forEach(i => {
                        msaiRows.push({
                            Categoria: cat.label,
                            Medida: MSAI_LABELS[i],
                            Ativa: msai[i] === '1' ? 'Sim' : 'Não',
                        });
                    });
                });
                const wsMsai = XLSX.utils.json_to_sheet(msaiRows);
                wsMsai['!cols'] = [{ wch: 25 }, { wch: 60 }, { wch: 15 }];
                XLSX.utils.book_append_sheet(wb, wsMsai, 'MSAI');
            }

            // ── Sheet 3.5: Adaptacoes ──
            if (exportSections.adaptacoes && adaptacoes) {
                const ADAPTACOES_LABELS = [
                    "A diversificação dos instrumentos de recolha de informação",
                    "Os enunciados em formatos acessíveis",
                    "A interpretação em LGP",
                    "A utilização de produtos de apoio",
                    "O tempo suplementar para realização da prova",
                    "A transcrição das respostas",
                    "A leitura de enunciados",
                    "A utilização de sala separada",
                    "As pausas vigiadas",
                    "O código de identificação de cores nos enunciados"
                ];
                const adaptRows: { Adaptação: string; Ativa: string }[] = [];
                const safeAdaptacaoString = adaptacoes.adaptacao || "00000000000";

                ADAPTACOES_LABELS.forEach((label, i) => {
                    adaptRows.push({
                        Adaptação: label,
                        Ativa: safeAdaptacaoString[i] === '1' ? 'Sim' : 'Não',
                    });
                });
                adaptRows.push({
                    Adaptação: 'Outros',
                    Ativa: safeAdaptacaoString[10] === '1' ? `Sim (${adaptacoes.outros || ''})` : 'Não',
                });
                adaptRows.push({
                    Adaptação: 'Observações',
                    Ativa: adaptacoes.observacoes || 'N/A',
                });

                const wsAdapt = XLSX.utils.json_to_sheet(adaptRows);
                wsAdapt['!cols'] = [{ wch: 65 }, { wch: 20 }];
                XLSX.utils.book_append_sheet(wb, wsAdapt, 'Adaptacoes');
            }

            // ── Sheet 4: Terapias ──
            if (exportSections.terapias && terapias) {
                const terapiasRows = [
                    { Terapia: 'Fisioterapia', Ativa: terapias.fisioterapia ? 'Sim' : 'Não' },
                    { Terapia: 'Terapia da Fala', Ativa: terapias.terapiaFala ? 'Sim' : 'Não' },
                    { Terapia: 'Terapia Ocupacional', Ativa: terapias.terapiaOcupacional ? 'Sim' : 'Não' },
                    { Terapia: 'Psicologia', Ativa: terapias.psicologia ? 'Sim' : 'Não' },
                    { Terapia: 'Outros', Ativa: terapias.outros ? `Sim (${terapias.outrosDescricao || ''})` : 'Não' },
                    { Terapia: 'Notas', Ativa: terapias.notasTerapia || '' },
                ];
                const wsTerapias = XLSX.utils.json_to_sheet(terapiasRows);
                wsTerapias['!cols'] = [{ wch: 25 }, { wch: 20 }];
                XLSX.utils.book_append_sheet(wb, wsTerapias, 'Terapias');
            }

            const date = new Date().toISOString().split('T')[0];
            const filename = `Aluno_${aluno.nome.replace(/\s+/g, '_')}_${date}.xlsx`;
            XLSX.writeFile(wb, filename);
            setMessage(`Ficheiro "${filename}" descarregado com sucesso!`);
            setTimeout(() => setMessage(''), 4000);
        } catch (err: any) {
            setMessage(`Erro ao exportar: ${err.message}`);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <div className="loading">A carregar dados do aluno...</div>;
    if (error || !aluno) return <div className="error-box">{error || 'Aluno não encontrado.'}</div>;

    const totalFaltas = presencas.filter(p => !p.presente).length;
    const totalPresentes = presencas.filter(p => p.presente).length;
    const msaiAtivas = [...msai].filter(c => c === '1').length;

    return (
        <IsLoggedIn>
            {professorId === aluno.professorId ? (
                <div className="container">

                    {/* ── Header ── */}
                    <button onClick={() => navigate(-1)} className="btn-view" style={{ marginBottom: '1.5rem' }}>
                        ← Voltar
                    </button>

                    <h1 className="title">Exportar Dados — {aluno.nome}</h1>
                    <p className="subtitle" style={{ fontSize: '1rem', color: '#777', marginTop: '-0.5rem' }}>
                        Turma: <strong>{aluno.turma}</strong>
                    </p>

                    {/* ── Feedback ── */}
                    {message && (
                        <div className={message.startsWith('Ficheiro') ? 'success-box' : 'error-box'}>
                            {message}
                        </div>
                    )}

                    {/* ── Section picker ── */}
                    <h2 className="subtitle" style={{ marginTop: '1.5rem' }}>Selecione as secções a exportar</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>

                        {/* Dados Pessoais */}
                        <label style={sectionLabelStyle(exportSections.dadosPessoais)}>
                            <input
                                type="checkbox"
                                checked={exportSections.dadosPessoais}
                                onChange={() => toggleSection('dadosPessoais')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Dados Pessoais</strong>
                                <p style={sectionDescStyle}>Nome, turma, diretor de turma e diagnóstico.</p>
                            </div>
                        </label>

                        {/* Encarregado */}
                        <label style={sectionLabelStyle(exportSections.encarregado)}>
                            <input
                                type="checkbox"
                                checked={exportSections.encarregado}
                                onChange={() => toggleSection('encarregado')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Encarregado de Educação</strong>
                                <p style={sectionDescStyle}>Contactos e detalhes do encarregado.</p>
                            </div>
                        </label>

                        {/* Aulas / Apoio */}
                        <label style={sectionLabelStyle(exportSections.presencas)}>
                            <input
                                type="checkbox"
                                checked={exportSections.presencas}
                                onChange={() => toggleSection('presencas')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Aulas / Apoio</strong>
                                <p style={sectionDescStyle}>
                                    {presencas.length === 0
                                        ? 'Sem registos.'
                                        : `${presencas.length} registo(s) — ${totalPresentes} presente(s), ${totalFaltas} falta(s).`}
                                </p>
                            </div>
                        </label>

                        {/* MSAI */}
                        <label style={sectionLabelStyle(exportSections.msai)}>
                            <input
                                type="checkbox"
                                checked={exportSections.msai}
                                onChange={() => toggleSection('msai')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Medidas de Suporte (MSAI)</strong>
                                <p style={sectionDescStyle}>
                                    {msaiAtivas === 0
                                        ? 'Nenhuma medida ativa.'
                                        : `${msaiAtivas} medida(s) ativa(s).`}
                                </p>
                            </div>
                        </label>

                        {/* Adaptacoes */}
                        <label style={sectionLabelStyle(exportSections.adaptacoes)} className="fade-in">
                            <input
                                type="checkbox"
                                checked={exportSections.adaptacoes}
                                onChange={() => toggleSection('adaptacoes')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Adaptações ao Processo de Avaliação</strong>
                                <p style={sectionDescStyle}>Medidas específicas e as tuas observações.</p>
                            </div>
                        </label>

                        {/* Terapias */}
                        <label style={sectionLabelStyle(exportSections.terapias)}>
                            <input
                                type="checkbox"
                                checked={exportSections.terapias}
                                onChange={() => toggleSection('terapias')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Terapias</strong>
                                <p style={sectionDescStyle}>Fisioterapia, Terapia da Fala, Psicologia, etc.</p>
                            </div>
                        </label>
                    </div>

                    {/* ── Export button ── */}
                    <div className="button-group">
                        <button onClick={handleExport} className="btn btn-green">
                            Exportar para Excel
                        </button>
                    </div>

                    {/* ── Preview tables ── */}

                    {/* Dados Pessoais preview */}
                    {exportSections.dadosPessoais && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Dados Pessoais</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                <table className="student-table">
                                    <thead>
                                        <tr>
                                            <th>Campo</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="row-even"><td>Nome</td><td>{aluno.nome}</td></tr>
                                        <tr className="row-odd"><td>Turma</td><td>{aluno.turma}</td></tr>
                                        <tr className="row-even"><td>Diretor de Turma</td><td>{aluno.diretorTurma || 'N/A'}</td></tr>
                                        <tr className="row-odd"><td>Diagnóstico / Notas</td><td>{aluno.notas || '—'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Encarregado preview */}
                    {exportSections.encarregado && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Encarregado de Educação</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                <table className="student-table">
                                    <thead>
                                        <tr>
                                            <th>Campo</th>
                                            <th>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {aluno.Encaregado && aluno.Encaregado.length > 0 ? (
                                            <>
                                                <tr className="row-even"><td>Nome</td><td>{aluno.Encaregado[0].nome || 'N/A'}</td></tr>
                                                <tr className="row-odd"><td>Parentesco</td><td>{aluno.Encaregado[0].tipo || 'N/A'}</td></tr>
                                                <tr className="row-even"><td>Email</td><td>{aluno.Encaregado[0].email || 'N/A'}</td></tr>
                                                <tr className="row-odd"><td>Contacto Telefónico</td><td>{aluno.Encaregado[0].telefone || 'N/A'}</td></tr>
                                            </>
                                        ) : (
                                            <tr className="row-even"><td colSpan={2} style={{ textAlign: 'center' }}>Sem encarregado de educação registado.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Aulas / Apoio preview */}
                    {exportSections.presencas && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Aulas e Apoio</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                {presencas.length === 0 ? (
                                    <p className="no-results">Sem registos de aulas/apoio.</p>
                                ) : (
                                    <table className="student-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Estado</th>
                                                <th>Sumário</th>
                                                <th>Atividades</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {presencas.map((p, i) => (
                                                <tr key={p.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                                                    <td>{formatDate(p.data)}</td>
                                                    <td>
                                                        {p.presente ? 'Presente' : 'Falta'}
                                                        {!p.presente && <span style={{ fontSize: '0.8rem', display: 'block', color: '#777' }}>{p.justifica ? '(Justificada)' : '(Não Justificada)'}</span>}
                                                    </td>
                                                    <td>{p.sumario || '—'}</td>
                                                    <td>{p.atividades?.length || 0} ativ.</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </>
                    )}

                    {/* MSAI preview */}
                    {exportSections.msai && (
                        <>
                            <h2 className="subtitle">Pré-visualização — MSAI</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                <table className="student-table">
                                    <thead>
                                        <tr>
                                            <th>Categoria</th>
                                            <th>Medida</th>
                                            <th>Ativa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {MSAI_CATEGORIES.flatMap(cat =>
                                            cat.indices.map((idx, j) => (
                                                <tr key={idx} className={j % 2 === 0 ? 'row-even' : 'row-odd'}>
                                                    <td>{cat.label}</td>
                                                    <td>{MSAI_LABELS[idx]}</td>
                                                    <td>{msai[idx] === '1' ? 'Sim' : '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Adaptacoes preview */}
                    {exportSections.adaptacoes && adaptacoes && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Adaptações ao Processo de Avaliação</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                <table className="student-table">
                                    <thead>
                                        <tr>
                                            <th>Adaptação</th>
                                            <th>Ativa</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const ADAPTACOES_LABELS = [
                                                "A diversificação dos instrumentos de recolha de informação",
                                                "Os enunciados em formatos acessíveis",
                                                "A interpretação em LGP",
                                                "A utilização de produtos de apoio",
                                                "O tempo suplementar para realização da prova",
                                                "A transcrição das respostas",
                                                "A leitura de enunciados",
                                                "A utilização de sala separada",
                                                "As pausas vigiadas",
                                                "O código de identificação de cores nos enunciados"
                                            ];
                                            const safeStr = adaptacoes.adaptacao || "00000000000";
                                            return (
                                                <>
                                                    {ADAPTACOES_LABELS.map((label, i) => (
                                                        <tr key={i} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                                                            <td>{label}</td>
                                                            <td>{safeStr[i] === '1' ? 'Sim' : 'Não'}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="row-even">
                                                        <td>Outros</td>
                                                        <td>{safeStr[10] === '1' ? `Sim (${adaptacoes.outros || ''})` : 'Não'}</td>
                                                    </tr>
                                                    <tr className="row-odd">
                                                        <td>Observações</td>
                                                        <td>{adaptacoes.observacoes || 'N/A'}</td>
                                                    </tr>
                                                </>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Terapias preview */}
                    {exportSections.terapias && terapias && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Terapias</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                <table className="student-table">
                                    <thead>
                                        <tr>
                                            <th>Terapia</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="row-even"><td>Fisioterapia</td><td>{terapias.fisioterapia ? 'Sim' : 'Não'}</td></tr>
                                        <tr className="row-odd"><td>Terapia da Fala</td><td>{terapias.terapiaFala ? 'Sim' : 'Não'}</td></tr>
                                        <tr className="row-even"><td>Terapia Ocupacional</td><td>{terapias.terapiaOcupacional ? 'Sim' : 'Não'}</td></tr>
                                        <tr className="row-odd"><td>Psicologia</td><td>{terapias.psicologia ? 'Sim' : 'Não'}</td></tr>
                                        <tr className="row-even"><td>Outros</td><td>{terapias.outros ? `Sim (${terapias.outrosDescricao || ''})` : 'Não'}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                </div>
            ) : (
                <div className="container">
                    <h1>Acesso Negado</h1>
                    <p>Você não tem permissão para acessar esta página.</p>
                </div>
            )
            }
        </IsLoggedIn>
    );
}

// ── Style helpers (avoids creating new objects per render via inline) ─────────

function sectionLabelStyle(active: boolean): React.CSSProperties {
    return {
        display: 'flex',
        alignItems: 'flex-start',
        padding: '1rem 1.25rem',
        borderRadius: '10px',
        border: `2px solid ${active ? '#10b981' : '#e5e7eb'}`,
        backgroundColor: active ? '#f0fdf4' : '#fafafa',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background-color 0.2s',
    };
}

const sectionDescStyle: React.CSSProperties = {
    margin: '0.2rem 0 0',
    fontSize: '0.85rem',
    color: '#666',
    fontWeight: 'normal',
};
