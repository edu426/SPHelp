import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import './ExcelTest.css';
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
}

interface Presenca {
    id: string;
    alunoId: string;
    data: string;
    presente: boolean;
    justifica: boolean;
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
    // UI state
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Which sections to export
    const [exportSections, setExportSections] = useState({
        dadosPessoais: true,
        presencas: true,
        msai: true,
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
        if (!exportSections.dadosPessoais && !exportSections.presencas && !exportSections.msai) {
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
                XLSX.utils.book_append_sheet(wb, wsDados, 'Dados Pessoais');
            }

            // ── Sheet 2: Presenças ──
            if (exportSections.presencas) {
                if (presencas.length === 0) {
                    const wsEmpty = XLSX.utils.json_to_sheet([{ Info: 'Sem registos de presença.' }]);
                    XLSX.utils.book_append_sheet(wb, wsEmpty, 'Presenças');
                } else {
                    const presRows = presencas.map(p => ({
                        'Data': formatDate(p.data),
                        'Estado': p.presente ? 'Presente' : 'Falta',
                        'Justificada': !p.presente ? (p.justifica ? 'Sim' : 'Não') : '—',
                    }));
                    const wsPresencas = XLSX.utils.json_to_sheet(presRows);
                    XLSX.utils.book_append_sheet(wb, wsPresencas, 'Presenças');
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
                XLSX.utils.book_append_sheet(wb, wsMsai, 'MSAI');
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

                        {/* Presenças */}
                        <label style={sectionLabelStyle(exportSections.presencas)}>
                            <input
                                type="checkbox"
                                checked={exportSections.presencas}
                                onChange={() => toggleSection('presencas')}
                                style={{ marginRight: '0.75rem', width: '18px', height: '18px', accentColor: '#10b981', cursor: 'pointer' }}
                            />
                            <div>
                                <strong>Presenças</strong>
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

                    {/* Presenças preview */}
                    {exportSections.presencas && (
                        <>
                            <h2 className="subtitle">Pré-visualização — Presenças</h2>
                            <div className="table-wrapper" style={{ marginBottom: '2rem' }}>
                                {presencas.length === 0 ? (
                                    <p className="no-results">Sem registos de presença.</p>
                                ) : (
                                    <table className="student-table">
                                        <thead>
                                            <tr>
                                                <th>Data</th>
                                                <th>Estado</th>
                                                <th>Justificada</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {presencas.map((p, i) => (
                                                <tr key={p.id} className={i % 2 === 0 ? 'row-even' : 'row-odd'}>
                                                    <td>{formatDate(p.data)}</td>
                                                    <td>{p.presente ? 'Presente' : 'Falta'}</td>
                                                    <td>{!p.presente ? (p.justifica ? 'Sim' : 'Não') : '—'}</td>
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
