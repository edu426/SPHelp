import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import IsLoggedIn from '../../functions/IsLoggedIn';
import './VerAluno.css';
import { useUser } from '@clerk/clerk-react';

// Objeto que representa o aluno
interface Student {
    id: string;
    nome: string;
    turma: string;
    notas: string;
    professorId: string;
    foto?: string;
    dataNasc?: string;
    diretorTurma?: string;
}

// Objeto que representa as terapias do aluno
interface TerapiasData {
    fisioterapia: boolean;
    terapiaFala: boolean;
    terapiaOcupacional: boolean;
    psicologia: boolean;
    outros: boolean;
    outrosDescricao: string | null;
    notasTerapia: string | null;
}

const DEFAULT_TERAPIAS: TerapiasData = {
    fisioterapia: false,
    terapiaFala: false,
    terapiaOcupacional: false,
    psicologia: false,
    outros: false,
    outrosDescricao: null,
    notasTerapia: null,
};

const calculateAge = (birthdate: string) => {
    const birthDate = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// Objeto que representa uma atividade
interface Atividade {
    id: string;
    resumo: string;
    concluida: boolean;
}

// Objeto que representa a presença (inclui sessÃµes de aula/apoio)
interface Presenca {
    id: string;
    alunoId: string;
    data: string;
    presente: boolean;  // true = presente, false = falta
    justifica: boolean;
    justificacao?: string | null;
    sumario?: string | null;        // preenchido em sessÃµes de aula/apoio
    atividades?: Atividade[];       // relação incluÃ­da pelo backend
}

export default function EditarAluno() {
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);

    // Get the :id from the URL
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Guarda os dados do aluno
    const [aluno, setAluno] = useState<Student | null>(null);

    // Controla o loading e o error durante o fetch
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);

    // Guarda os valores iniciais enquanto se edita
    const [form, setForm] = useState({ nome: '', turma: '', notas: '', foto: '', dataNasc: '', diretorTurma: '' });

    // MSAI State
    const [msai, setMsai] = useState("000000000000000");
    const [originalMsai, setOriginalMsai] = useState("000000000000000");

    // Terapias State
    const [terapias, setTerapias] = useState<TerapiasData>(DEFAULT_TERAPIAS);
    const [originalTerapias, setOriginalTerapias] = useState<TerapiasData>(DEFAULT_TERAPIAS);

    // Espera q o PUT acabe
    const [saving, setSaving] = useState(false);


    // Guarda as presenças do aluno (faltas)
    const [presencas, setPresencas] = useState<Presenca[]>([]);
    const [loadingFaltas, setLoadingFaltas] = useState(true);

    // ── Aulas (unified) state ──
    const [showAulaForm, setShowAulaForm] = useState(false);
    const [novaAula, setNovaAula] = useState({
        data: '',
        sumario: '',
        presente: true,
        justifica: false,
        justificacao: '',
        addAtividade: false,
        resumoAtividade: '',
        concluida: false,
    });
    const [addingAula, setAddingAula] = useState(false);


    // Justification inline edit
    const [editingFaltaId, setEditingFaltaId] = useState<string | null>(null);
    const [editingJustificacao, setEditingJustificacao] = useState('');

    // Activity inline edit
    const [editingAtividadeId, setEditingAtividadeId] = useState<string | null>(null);
    const [editingAtividade, setEditingAtividade] = useState({ resumo: '', concluida: false });
    const [savingAtividade, setSavingAtividade] = useState(false);

    // Add-activity inline form (per card)
    const [addingAtividadeForId, setAddingAtividadeForId] = useState<string | null>(null);
    const [newAtividade, setNewAtividade] = useState({ resumo: '', concluida: false });
    const [savingNewAtividade, setSavingNewAtividade] = useState(false);

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

    // Fetch aos dados do aluno
    useEffect(() => {
        const fetchAluno = async () => {
            try {
                setLoading(true);
                const response = await fetch(`/api/alunos/detalhe/${id}`);
                if (!response.ok) throw new Error('Aluno não encontrado.');
                const data = await response.json();

                setAluno(data);

                // insere os valores iniciais nos campos
                const formattedDate = data.dataNasc ? new Date(data.dataNasc).toISOString().split('T')[0] : '';
                setForm({ nome: data.nome, turma: data.turma, notas: data.notas, foto: data.foto || '', dataNasc: formattedDate, diretorTurma: data.diretorTurma || '' });

                // Fetch MSAI
                const msaiResponse = await fetch(`/api/msai/${id}`);
                if (msaiResponse.ok) {
                    const msaiData = await msaiResponse.json();
                    if (msaiData && msaiData.msai) {
                        setMsai(msaiData.msai);
                        setOriginalMsai(msaiData.msai);
                    }
                }

                // Fetch Terapias
                const terapiasResponse = await fetch(`/api/terapias/${id}`);
                if (terapiasResponse.ok) {
                    const terapiasData = await terapiasResponse.json();
                    setTerapias(terapiasData);
                    setOriginalTerapias(terapiasData);
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados do aluno.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAluno();
    }, [id]);

    // Fetch das presenças deste aluno
    useEffect(() => {
        const fetchPresencas = async () => {
            try {
                setLoadingFaltas(true);
                const response = await fetch(`/api/presenca/${id}`);
                if (!response.ok) throw new Error();
                const data = await response.json();
                setPresencas(data);
            } catch {
                // A lista ficará vazia
            } finally {
                setLoadingFaltas(false);
            }
        };
        if (id) fetchPresencas();
    }, [id]);

    // Chamado a cada toque no teclado em qualquer campo.
    // Atualiza apenas o campo alterado dentro do objeto `form`.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setForm(prev => ({ ...prev, foto: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleMsaiChange = (index: number) => {
        if (!isEditing) return;
        const newMsai = msai.substring(0, index) + (msai[index] === '1' ? '0' : '1') + msai.substring(index + 1);
        setMsai(newMsai);
    };

    // Envia os dados para o PUT /api/alunos/:id
    const handleSave = async () => {
        setSaving(true);

        try {
            const response = await fetch(`/api/alunos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!response.ok) throw new Error('Erro ao guardar.');

            // Save MSAI
            const msaiResponse = await fetch(`/api/msai/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ msai }),
            });
            if (!msaiResponse.ok) throw new Error('Erro ao guardar medidas MSAI.');

            // Save Terapias
            const terapiasResponse = await fetch(`/api/terapias/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(terapias),
            });
            if (!terapiasResponse.ok) throw new Error('Erro ao guardar terapias.');

            const updated = await response.json();
            setAluno(updated);
            setOriginalMsai(msai);
            setOriginalTerapias(terapias);

            setIsEditing(false);
            toast.success('Alterações guardadas com sucesso!');

        } catch (err: any) {
            toast.error(err.message || 'Erro ao guardar alterações.');
        } finally {
            setSaving(false);
        }
    };

    // Reseta os valores iniciais e sai do modo de edição
    const handleCancel = () => {
        if (aluno) {
            const formattedDate = aluno.dataNasc ? new Date(aluno.dataNasc).toISOString().split('T')[0] : '';
            setForm({ nome: aluno.nome, turma: aluno.turma, notas: aluno.notas, foto: aluno.foto || '', dataNasc: formattedDate, diretorTurma: aluno.diretorTurma || '' });
        }
        setMsai(originalMsai);
        setTerapias(originalTerapias);
        setIsEditing(false);
    };

    // Formats ISO date to DD/MM/YYYY
    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Envia um PUT para atualizar os campos `justifica` e `justificacao` de uma presença
    const handleJustificar = async (presencaId: string, novoValor: boolean) => {
        if (novoValor && !editingJustificacao.trim()) {
            toast.error('Por favor, preencha a justificação.');
            return;
        }
        try {
            const response = await fetch(`/api/presenca/${presencaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    justifica: novoValor,
                    justificacao: novoValor ? editingJustificacao.trim() : null,
                }),
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao atualizar.');
            }
            const updated = await response.json();
            // Atualiza apenas este registo na lista local, sem recarregar tudo
            setPresencas(prev => prev.map(p => p.id === presencaId ? updated : p));
            setEditingFaltaId(null);
            setEditingJustificacao('');
            toast.success('Presença atualizada com sucesso!');

        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar presença.');
        }
    };

    // Helper to get current datetime formatted for the input 'max' attribute
    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Registar nova aula (unified: sempre tem sumário + data + presente)
    const handleAddAula = async () => {
        if (!novaAula.sumario.trim()) {
            toast.error('Por favor, preencha o sumário da aula.');
            return;
        }
        if (!novaAula.presente && novaAula.justifica && !novaAula.justificacao.trim()) {
            toast.error('Por favor, preencha a justificação da falta.');
            return;
        }
        if (novaAula.addAtividade && !novaAula.resumoAtividade.trim()) {
            toast.error('Por favor, preencha o resumo da atividade.');
            return;
        }
        setAddingAula(true);

        try {
            let atividades = undefined;
            if (novaAula.addAtividade && novaAula.resumoAtividade.trim()) {
                atividades = [{ resumo: novaAula.resumoAtividade.trim(), concluida: novaAula.concluida }];
            }

            const presRes = await fetch('/api/presenca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    alunoId: id,
                    presente: novaAula.presente,
                    justifica: novaAula.presente ? false : novaAula.justifica,
                    justificacao: (!novaAula.presente && novaAula.justifica) ? novaAula.justificacao.trim() : undefined,
                    sumario: novaAula.sumario.trim(),
                    data: novaAula.data || undefined,
                    atividades,
                }),
            });
            if (!presRes.ok) {
                const errData = await presRes.json();
                throw new Error(errData.error || 'Erro ao registar aula.');
            }
            const nova = await presRes.json();
            setPresencas(prev => [nova, ...prev]);
            setShowAulaForm(false);
            setNovaAula({ data: '', sumario: '', presente: true, justifica: false, justificacao: '', addAtividade: false, resumoAtividade: '', concluida: false });
            toast.success('Aula registada com sucesso!');

        } catch (err: any) {
            toast.error(err.message || 'Erro ao registar aula.');
        } finally {
            setAddingAula(false);
        }
    };

    // Guardar edição de atividade
    const handleSaveAtividade = async () => {
        if (!editingAtividadeId) return;
        if (!editingAtividade.resumo.trim()) {
            toast.error('O resumo da atividade não pode estar vazio.');
            return;
        }
        setSavingAtividade(true);
        try {
            const res = await fetch(`/api/atividades/${editingAtividadeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumo: editingAtividade.resumo.trim(), concluida: editingAtividade.concluida }),
            });
            if (!res.ok) throw new Error('Erro ao guardar atividade.');
            const updated: Atividade = await res.json();
            setPresencas(prev => prev.map(p => {
                if (p.atividades && p.atividades.some(a => a.id === updated.id)) {
                    return { ...p, atividades: p.atividades.map(a => a.id === updated.id ? updated : a) };
                }
                return p;
            }));
            setEditingAtividadeId(null);
            toast.success('Atividade atualizada com sucesso!');

        } catch (err: any) {
            toast.error(err.message || 'Erro ao atualizar atividade.');
        } finally {
            setSavingAtividade(false);
        }
    };

    // Adicionar nova atividade a uma aula já existente
    const handleAddAtividadeToAula = async (presencaId: string) => {
        if (!newAtividade.resumo.trim()) {
            toast.error('Por favor, preencha o resumo da atividade.');
            return;
        }
        setSavingNewAtividade(true);
        try {
            const atRes = await fetch('/api/atividades', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumo: newAtividade.resumo.trim(), concluida: newAtividade.concluida, presencaId }),
            });
            if (!atRes.ok) throw new Error('Erro ao criar atividade.');
            const atData: Atividade = await atRes.json();

            setPresencas(prev => prev.map(p => {
                if (p.id === presencaId) {
                    return { ...p, atividades: [...(p.atividades || []), atData] };
                }
                return p;
            }));
            setAddingAtividadeForId(null);
            setNewAtividade({ resumo: '', concluida: false });
            toast.success('Atividade adicionada com sucesso!');

        } catch (err: any) {
            toast.error((err.message || 'Erro ao adicionar atividade.'));
        } finally {
            setSavingNewAtividade(false);
        }
    };

    // Counts
    const totalAulas = presencas.length;
    const totalFaltas = presencas.filter(p => !p.presente).length;

    // Mensagem de loading enquanto o fetch está em progresso
    if (loading) return <div className="ver-aluno-loading">A carregar informações do aluno...</div>;

    // Mensagem de erro se o aluno não foi encontrado ou o fetch falhou
    if (error || !aluno) return <div className="ver-aluno-error">{error || 'Aluno não encontrado.'}</div>;

    // Iniciais do nome do aluno (IMAGEM CIRCULAR)
    const initials = aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <IsLoggedIn>
            {professorId == aluno.professorId ? (
                <div className="ver-aluno-page">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <button onClick={() => navigate(-1)} className="btn-view" style={{ margin: 0 }}>← Voltar</button>
                        <Link to={`/exportar-aluno/${aluno.id}`} className="btn-export">
                            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '6px', fontSize: '1.2rem' }}>download</span>
                            Exportar
                        </Link>
                    </div>
                    <div className="ver-aluno-header">
                        <div>
                            <h1>Ficha do Aluno</h1>
                            <p className="subtitle">
                                {isEditing ? 'A editar informações do aluno.' : 'Informações detalhadas do aluno selecionado.'}
                            </p>

                        </div>
                    </div>

                    {/* Edit actions moved to FAB */}

                    {/* ── Floating Action Buttons (FAB) ── */}
                    {!isEditing ? (
                        <button className="fab-button fab-edit" onClick={() => setIsEditing(true)} title="Editar Aluno">
                            <span className="material-symbols-outlined">edit</span>
                        </button>
                    ) : (
                        <div className="fab-actions-container">
                            <button className="fab-button fab-cancel" onClick={handleCancel} title="Cancelar Edição">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                            <button className="fab-button fab-save" onClick={handleSave} disabled={saving} title="Guardar Alterações">
                                <span className="material-symbols-outlined">{saving ? 'sync' : 'save'}</span>
                            </button>
                        </div>
                    )}

                    {/* ── Layout em Duas Colunas ── */}
                    <div className="aluno-two-columns">
                        <div className="aluno-column-left">
                            {/* ── Student info card ── */}
                            <div className="aluno-card">
                                <div className="aluno-avatar">
                                    {aluno.foto && !isEditing ? (
                                        <img src={aluno.foto} alt={`Foto de ${aluno.nome}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : form.foto && isEditing ? (
                                        <img src={form.foto} alt="Preview da Foto" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                    ) : (
                                        initials
                                    )}
                                </div>

                                {isEditing && (
                                    <div className="info-row">
                                        <span className="info-label">Fotografia</span>
                                        <input type="file" accept="image/*" onChange={handleFileChange} className="edit-input" style={{ border: 'none', padding: '0' }} />
                                    </div>
                                )}

                                <div className="info-row">
                                    <span className="info-label">Nome</span>
                                    {isEditing
                                        ? <input className="edit-input" name="nome" value={form.nome} onChange={handleChange} />
                                        : <span className="info-value">{aluno.nome}</span>
                                    }
                                </div>

                                <div className="info-row">
                                    <span className="info-label">Turma</span>
                                    {isEditing
                                        ? <input className="edit-input" name="turma" value={form.turma} onChange={handleChange} />
                                        : <span className="info-value">{aluno.turma}</span>
                                    }
                                </div>

                                <div className="info-row">
                                    <span className="info-label">Data de Nascimento</span>
                                    {isEditing
                                        ? <input className="edit-input" type="date" name="dataNasc" value={form.dataNasc} onChange={handleChange} />
                                        : <span className="info-value">{aluno.dataNasc ? `${new Date(aluno.dataNasc).toLocaleDateString('pt-PT')} - ${calculateAge(aluno.dataNasc)} anos` : 'N/A'}</span>
                                    }
                                </div>

                                <div className="info-row">
                                    <span className="info-label">Diretor de Turma</span>
                                    {isEditing
                                        ? <input className="edit-input" name="diretorTurma" value={form.diretorTurma} onChange={handleChange} />
                                        : <span className="info-value">{aluno.diretorTurma || 'N/A'}</span>
                                    }
                                </div>

                                <div className="info-row">
                                    <span className="info-label">
                                        Diagnóstico
                                        <span
                                            data-tooltip="Resumo clínico ou diagnóstico educacional do aluno"
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '0.95rem', color: '#bbb', verticalAlign: 'middle', marginLeft: '5px', cursor: 'help' }}
                                        >info</span>
                                    </span>
                                    {isEditing
                                        ? <textarea className="edit-input edit-textarea" name="notas" value={form.notas} onChange={handleChange} />
                                        : <span className="info-value">{aluno.notas}</span>
                                    }
                                </div>
                            </div>

                            {/* ── Secção Terapias ── */}
                            <div className="msai-section" style={{ marginTop: '1.5rem' }}>
                                <div className="faltas-header">
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Terapias
                                        <span
                                            data-tooltip="Registo das terapias que o aluno frequenta fora ou dentro da escola"
                                            className="material-symbols-outlined"
                                            style={{ fontSize: '1.1rem', color: '#aaa', verticalAlign: 'middle', cursor: 'help' }}
                                        >info</span>
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                                    {([
                                        { key: 'fisioterapia', label: 'Fisioterapia' },
                                        { key: 'terapiaFala', label: 'Terapia da Fala' },
                                        { key: 'terapiaOcupacional', label: 'Terapia Ocupacional' },
                                        { key: 'psicologia', label: 'Psicologia' },
                                        { key: 'outros', label: 'Outros' },
                                    ] as { key: keyof TerapiasData; label: string }[]).map(({ key, label }) => (
                                        <label key={key} className="msai-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={!!terapias[key]}
                                                onChange={e => setTerapias(prev => ({
                                                    ...prev,
                                                    [key]: e.target.checked,
                                                    ...(key === 'outros' && !e.target.checked ? { outrosDescricao: null } : {}),
                                                }))}
                                                disabled={!isEditing}
                                            />
                                            {' '}{label}
                                        </label>
                                    ))}

                                    {/* Descrição de "Outros" — só editável quando outros=true */}
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <label className="info-label" style={{ fontSize: '0.85rem' }}>Descrição (Outros)</label>
                                        <input
                                            className="edit-input"
                                            style={{ marginTop: '0.3rem', opacity: terapias.outros ? 1 : 0.4 }}
                                            placeholder={terapias.outros ? 'Descreva a terapia...' : 'Ative "Outros" para editar'}
                                            value={terapias.outrosDescricao || ''}
                                            onChange={e => setTerapias(prev => ({ ...prev, outrosDescricao: e.target.value }))}
                                            disabled={!isEditing || !terapias.outros}
                                        />
                                    </div>

                                    {/* Notas gerais de terapia */}
                                    <div style={{ marginTop: '0.4rem' }}>
                                        <label className="info-label" style={{ fontSize: '0.85rem' }}>Notas / Observações</label>
                                        <textarea
                                            className="edit-input edit-textarea"
                                            style={{ marginTop: '0.3rem' }}
                                            placeholder="Observações gerais sobre as terapias..."
                                            value={terapias.notasTerapia || ''}
                                            onChange={e => setTerapias(prev => ({ ...prev, notasTerapia: e.target.value }))}
                                            disabled={!isEditing}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="aluno-column-right">
                            {/* ── Secção de MSAI ── */}
                            <div className="msai-section">
                                <div className="faltas-header">
                                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        MSAI
                                        <span data-tooltip="Medidas de Suporte à Aprendizagem e à Inclusão" className="material-symbols-outlined" style={{ fontSize: '1.2rem', color: '#999', cursor: 'help' }}>info</span>
                                    </h2>
                                </div>
                                <div className="msai-columns">
                                    <div className="msai-column">
                                        <h3>Medidas Universais</h3>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[0] === '1'} onChange={() => handleMsaiChange(0)} disabled={!isEditing} /> a) Diferenciação pedagógica</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[1] === '1'} onChange={() => handleMsaiChange(1)} disabled={!isEditing} />b) Acomodações curriculares</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[2] === '1'} onChange={() => handleMsaiChange(2)} disabled={!isEditing} />c) O enriquecimento curricular</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[3] === '1'} onChange={() => handleMsaiChange(3)} disabled={!isEditing} />d) A promoção do comportamento pró-social</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[4] === '1'} onChange={() => handleMsaiChange(4)} disabled={!isEditing} />e) A intervenção com foco académico ou comportamental em pequenos grupos</label>
                                    </div>
                                    <div className="msai-column">
                                        <h3>Medidas Seletivas</h3>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[5] === '1'} onChange={() => handleMsaiChange(5)} disabled={!isEditing} />a) Os percursos curriculares diferenciados</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[6] === '1'} onChange={() => handleMsaiChange(6)} disabled={!isEditing} />b) As adaptações curriculares não significativas</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[7] === '1'} onChange={() => handleMsaiChange(7)} disabled={!isEditing} />c) Apoio psicopedagógico</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[8] === '1'} onChange={() => handleMsaiChange(8)} disabled={!isEditing} />d) A antecipação e o reforço das aprendizagens</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[9] === '1'} onChange={() => handleMsaiChange(9)} disabled={!isEditing} />e) O apoio tutorial</label>
                                    </div>
                                    <div className="msai-column">
                                        <h3>Medidas Adicionais</h3>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[10] === '1'} onChange={() => handleMsaiChange(10)} disabled={!isEditing} />a) A frequência do ano de escolaridade por disciplinas</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[11] === '1'} onChange={() => handleMsaiChange(11)} disabled={!isEditing} />b) As adaptações curriculares significativas</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[12] === '1'} onChange={() => handleMsaiChange(12)} disabled={!isEditing} />c) O plano individual de transição</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[13] === '1'} onChange={() => handleMsaiChange(13)} disabled={!isEditing} />d) O desenvolvimento de metodologias e estratégias de ensino estruturado</label>
                                        <label className="msai-checkbox"><input type="checkbox" checked={msai[14] === '1'} onChange={() => handleMsaiChange(14)} disabled={!isEditing} />e) O desenvolvimento de competências de autonomia pessoal e social</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Secção Aulas (unificada) ── */}
                    <div className="aulas-full-width-container">
                        <div className="aulas-section">
                            <div className="faltas-header">
                                <div>
                                    <h2>Aulas / Apoio</h2>
                                    {!loadingFaltas && (
                                        <p className="faltas-summary">
                                            {totalAulas === 0
                                                ? 'Nenhuma aula registada.'
                                                : `${totalAulas} aula${totalAulas > 1 ? 's' : ''} · ${totalFaltas} falta${totalFaltas !== 1 ? 's' : ''}`}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Mensagem de feedback */}

                            {/* Lista de aulas */}
                            {loadingFaltas ? (
                                <p className="faltas-loading">A carregar aulas...</p>
                            ) : (
                                <div className="aulas-list">
                                    {presencas.length === 0 && (
                                        <p className="faltas-empty">Nenhuma aula registada ainda.</p>
                                    )}
                                    {presencas.map(p => (
                                        <div key={p.id} className={`aula-card ${!p.presente && !p.justifica ? 'aula-card-absent' : ''}`}>

                                            {/* Header: data + badge de presença */}
                                            <div className="aula-card-header">
                                                <span className="aula-card-date"><span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px' }}>calendar_month</span> {formatDate(p.data)}</span>
                                                <span className={p.presente ? 'badge-presente' : 'badge-falta'}>
                                                    {p.presente ? <><span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#10b981' }}>check_circle</span>Presente</> : <><span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#ef4444' }}>cancel</span>Falta</>}
                                                </span>
                                            </div>

                                            {/* Sumário */}
                                            {p.sumario && p.sumario !== 'N/A' && (
                                                <p className="aula-card-sumario">{p.sumario}</p>
                                            )}

                                            {/* Justificação (se falta) */}
                                            {!p.presente && (
                                                <div className="aula-card-justificacao">
                                                    {editingFaltaId === p.id ? (
                                                        <div className="atividade-edit-form">
                                                            <label className="info-label">Motivo da justificação</label>
                                                            <textarea
                                                                className="edit-input edit-textarea"
                                                                placeholder="Descreva o motivo da falta..."
                                                                value={editingJustificacao}
                                                                onChange={e => setEditingJustificacao(e.target.value)}
                                                                rows={2}
                                                            />
                                                            <div className="falta-form-actions" style={{ marginTop: '0.4rem' }}>
                                                                <button className="btn-save" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => handleJustificar(p.id, true)}>Justificar <span className="material-symbols-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle', marginLeft: '4px' }}>check</span></button>
                                                                {p.justifica && (
                                                                    <button className="btn-cancel" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => handleJustificar(p.id, false)}>Remover</button>
                                                                )}
                                                                <button className="btn-cancel" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem' }} onClick={() => { setEditingFaltaId(null); setEditingJustificacao(''); }}>Cancelar</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="justificacao-row">
                                                            {p.justifica ? (
                                                                <span className="justificacao-sim" title={p.justificacao || ''}>
                                                                    <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#10b981' }}>check</span>Justificada {p.justificacao && <em> {p.justificacao.length > 40 ? p.justificacao.slice(0, 40) + '...' : p.justificacao}</em>}
                                                                </span>
                                                            ) : (
                                                                <span className="justificacao-nao"><span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#f59e0b' }}>warning</span>Não justificada</span>
                                                            )}
                                                            <button
                                                                className="btn-edit-falta"
                                                                title="Editar justificação"
                                                                onClick={() => { setEditingFaltaId(p.id); setEditingJustificacao(p.justificacao || ''); }}
                                                            >
                                                                <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Atividades list */}
                                            {p.atividades && p.atividades.map(ativ => (
                                                editingAtividadeId === ativ.id ? (
                                                    <div key={ativ.id} className="atividade-edit-form">
                                                        <label className="info-label">Resumo da Atividade <span style={{ color: '#e55' }}>*</span></label>
                                                        <textarea
                                                            className="edit-input edit-textarea"
                                                            value={editingAtividade.resumo}
                                                            onChange={e => setEditingAtividade(prev => ({ ...prev, resumo: e.target.value }))}
                                                            rows={2}
                                                        />
                                                        <label className="falta-check-label" style={{ marginTop: '0.4rem' }}>
                                                            <input
                                                                type="checkbox"
                                                                checked={editingAtividade.concluida}
                                                                onChange={e => setEditingAtividade(prev => ({ ...prev, concluida: e.target.checked }))}
                                                            />
                                                            Concluída
                                                        </label>
                                                        <div className="falta-form-actions" style={{ marginTop: '0.5rem' }}>
                                                            <button className="btn-save" onClick={handleSaveAtividade} disabled={savingAtividade}>
                                                                {savingAtividade ? 'A guardar...' : 'Guardar'}
                                                            </button>
                                                            <button className="btn-cancel" onClick={() => setEditingAtividadeId(null)}>Cancelar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div key={ativ.id} className="atividade-badge" style={{ marginBottom: '0.5rem' }}>
                                                        <span className="atividade-badge-icon material-symbols-outlined" style={{ fontSize: '1.2rem', verticalAlign: 'middle', color: ativ.concluida ? '#10b981' : '#f59e0b' }}>{ativ.concluida ? 'check_circle' : 'hourglass_empty'}</span>
                                                        <span className="atividade-badge-text">{ativ.resumo}</span>
                                                        <button
                                                            className="btn-edit-falta"
                                                            title="Editar atividade"
                                                            onClick={() => {
                                                                setEditingAtividadeId(ativ.id);
                                                                setEditingAtividade({ resumo: ativ.resumo, concluida: ativ.concluida });
                                                            }}
                                                        >
                                                            <span className="material-symbols-outlined" style={{ fontSize: '1.2rem' }}>edit</span>
                                                        </button>
                                                    </div>
                                                )
                                            ))}

                                            {/* Form para adicionar nova atividade */}
                                            {addingAtividadeForId === p.id ? (
                                                <div className="atividade-edit-form">
                                                    <label className="info-label">Resumo da Atividade <span style={{ color: '#e55' }}>*</span></label>
                                                    <textarea
                                                        className="edit-input edit-textarea"
                                                        placeholder="Descreva a atividade proposta..."
                                                        value={newAtividade.resumo}
                                                        onChange={e => setNewAtividade(prev => ({ ...prev, resumo: e.target.value }))}
                                                        rows={2}
                                                    />
                                                    <label className="falta-check-label" style={{ marginTop: '0.4rem' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={newAtividade.concluida}
                                                            onChange={e => setNewAtividade(prev => ({ ...prev, concluida: e.target.checked }))}
                                                        />
                                                        Já concluída
                                                    </label>
                                                    <div className="falta-form-actions" style={{ marginTop: '0.5rem' }}>
                                                        <button className="btn-save" onClick={() => handleAddAtividadeToAula(p.id)} disabled={savingNewAtividade}>
                                                            {savingNewAtividade ? 'A guardar...' : 'Guardar'}
                                                        </button>
                                                        <button className="btn-cancel" onClick={() => { setAddingAtividadeForId(null); setNewAtividade({ resumo: '', concluida: false }); }}>Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <button
                                                    className="btn-add-atividade"
                                                    onClick={() => { setAddingAtividadeForId(p.id); setNewAtividade({ resumo: '', concluida: false }); }}
                                                >
                                                    + Atividade
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Formulário para registar nova aula */}
                            {showAulaForm && (
                                <div className="aula-form">
                                    <p className="falta-form-title">Registar Nova Aula</p>

                                    <div className="form-group">
                                        <label className="info-label">Data e Hora (opcional)</label>
                                        <input
                                            type="datetime-local"
                                            className="edit-input"
                                            value={novaAula.data}
                                            max={getCurrentDateTimeLocal()}
                                            onChange={e => setNovaAula(prev => ({ ...prev, data: e.target.value }))}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="info-label">Sumário <span style={{ color: '#e55' }}>*</span></label>
                                        <textarea
                                            className="edit-input edit-textarea"
                                            placeholder="O que foi trabalhado nesta aula..."
                                            value={novaAula.sumario}
                                            onChange={e => setNovaAula(prev => ({ ...prev, sumario: e.target.value }))}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="falta-toggle">
                                        <button
                                            className={`toggle-btn ${novaAula.presente ? 'toggle-active' : ''}`}
                                            onClick={() => setNovaAula(prev => ({ ...prev, presente: true, justifica: false, justificacao: '' }))}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#10b981' }}>check_circle</span>Presente
                                        </button>
                                        <button
                                            className={`toggle-btn ${!novaAula.presente ? 'toggle-active' : ''}`}
                                            onClick={() => setNovaAula(prev => ({ ...prev, presente: false }))}
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '1.1rem', verticalAlign: 'middle', marginRight: '4px', color: '#ef4444' }}>cancel</span>Falta
                                        </button>
                                    </div>

                                    {!novaAula.presente && (
                                        <>
                                            <label className="falta-check-label">
                                                <input
                                                    type="checkbox"
                                                    checked={novaAula.justifica}
                                                    onChange={e => setNovaAula(prev => ({ ...prev, justifica: e.target.checked, justificacao: '' }))}
                                                />
                                                Falta justificada
                                            </label>
                                            {novaAula.justifica && (
                                                <div className="form-group">
                                                    <label className="info-label">Motivo <span style={{ color: '#e55' }}>*</span></label>
                                                    <textarea
                                                        className="edit-input edit-textarea"
                                                        placeholder="Descreva o motivo da falta..."
                                                        value={novaAula.justificacao}
                                                        onChange={e => setNovaAula(prev => ({ ...prev, justificacao: e.target.value }))}
                                                        rows={2}
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <label className="falta-check-label">
                                        <input
                                            type="checkbox"
                                            checked={novaAula.addAtividade}
                                            onChange={e => setNovaAula(prev => ({ ...prev, addAtividade: e.target.checked, resumoAtividade: '', concluida: false }))}
                                        />
                                        Adicionar Atividade
                                    </label>

                                    {novaAula.addAtividade && (
                                        <>
                                            <div className="form-group">
                                                <label className="info-label">Resumo da Atividade <span style={{ color: '#e55' }}>*</span></label>
                                                <textarea
                                                    className="edit-input edit-textarea"
                                                    placeholder="Descreva a atividade proposta..."
                                                    value={novaAula.resumoAtividade}
                                                    onChange={e => setNovaAula(prev => ({ ...prev, resumoAtividade: e.target.value }))}
                                                    rows={2}
                                                />
                                            </div>
                                            <label className="falta-check-label">
                                                <input
                                                    type="checkbox"
                                                    checked={novaAula.concluida}
                                                    onChange={e => setNovaAula(prev => ({ ...prev, concluida: e.target.checked }))}
                                                />
                                                Atividade já concluída
                                            </label>
                                        </>
                                    )}

                                    <div className="falta-form-actions">
                                        <button className="btn-save" onClick={handleAddAula} disabled={addingAula}>
                                            {addingAula ? 'A registar...' : 'Confirmar'}
                                        </button>
                                        <button className="btn-cancel" onClick={() => setShowAulaForm(false)}>Cancelar</button>
                                    </div>
                                </div>
                            )}

                            {!showAulaForm && (
                                <button className="btn-add-aula" onClick={() => setShowAulaForm(true)}>
                                    + Registar Aula
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="ver-aluno-page">
                    <button onClick={() => navigate(-1)} className="btn-view">← Voltar</button>
                    <div className="ver-aluno-header">
                        <div>
                            <h1>Este aluno não é seu</h1>
                        </div>
                    </div>
                </div>
            )}
        </IsLoggedIn>
    );
}
