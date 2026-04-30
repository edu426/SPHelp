import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
}

// Objeto que representa a presença
interface Presenca {
    id: string;
    alunoId: string;
    data: string;
    presente: boolean;  // true = presente, false = falta
    justifica: boolean;
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
    const [form, setForm] = useState({ nome: '', turma: '', notas: '', foto: '' });

    // MSAI State
    const [msai, setMsai] = useState("000000000000000");
    const [originalMsai, setOriginalMsai] = useState("000000000000000");

    // Espera q o PUT acabe
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Guarda as presenças do aluno (faltas)
    const [presencas, setPresencas] = useState<Presenca[]>([]);
    const [loadingFaltas, setLoadingFaltas] = useState(true);

    // Visibilidade do formulário de adicionar falta
    const [showFaltaForm, setShowFaltaForm] = useState(false);

    // Valores para a nova falta que está a ser registada
    const [novaFalta, setNovaFalta] = useState({ presente: false, justifica: false, data: '' });
    const [addingFalta, setAddingFalta] = useState(false);
    const [faltaMessage, setFaltaMessage] = useState('');

    // ID da falta que está a ser editada inline (para justificar)
    const [editingFaltaId, setEditingFaltaId] = useState<string | null>(null);

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
                setForm({ nome: data.nome, turma: data.turma, notas: data.notas, foto: data.foto || '' });

                // Fetch MSAI
                const msaiResponse = await fetch(`/api/msai/${id}`);
                if (msaiResponse.ok) {
                    const msaiData = await msaiResponse.json();
                    if (msaiData && msaiData.msai) {
                        setMsai(msaiData.msai);
                        setOriginalMsai(msaiData.msai);
                    }
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
        setSaveMessage('');
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

            const updated = await response.json();
            setAluno(updated);
            setOriginalMsai(msai);

            setIsEditing(false);
            setSaveMessage('✅ Alterações guardadas com sucesso!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err: any) {
            setSaveMessage('❌ ' + (err.message || 'Erro ao guardar alterações.'));
        } finally {
            setSaving(false);
        }
    };

    // Reseta os valores iniciais e sai do modo de edição
    const handleCancel = () => {
        if (aluno) setForm({ nome: aluno.nome, turma: aluno.turma, notas: aluno.notas, foto: aluno.foto || '' });
        setMsai(originalMsai);
        setIsEditing(false);
    };

    // Envia uma nova presença para o POST /api/presenca
    const handleAddFalta = async () => {
        setAddingFalta(true);
        setFaltaMessage('');
        try {
            const response = await fetch('/api/presenca', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ alunoId: id, presente: novaFalta.presente, justifica: novaFalta.justifica, data: novaFalta.data || undefined }),
            });
            if (!response.ok) throw new Error('Erro ao registar.');
            const novo = await response.json();

            // Adiciona a nova presença ao topo da lista
            setPresencas([novo, ...presencas]);
            setShowFaltaForm(false);
            setNovaFalta({ presente: false, justifica: false, data: '' });
            setFaltaMessage('✅ Falta registada com sucesso!');
            setTimeout(() => setFaltaMessage(''), 3000);
        } catch (err: any) {
            setFaltaMessage('❌ ' + (err.message || 'Erro ao registar falta.'));
        } finally {
            setAddingFalta(false);
        }
    };

    // Formats ISO date to DD/MM/YYYY
    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // Envia um PUT para atualizar só o campo `justifica` de uma presença
    const handleJustificar = async (presencaId: string, novoValor: boolean) => {
        try {
            const response = await fetch(`/api/presenca/${presencaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ justifica: novoValor }),
            });
            if (!response.ok) throw new Error('Erro ao atualizar.');
            const updated = await response.json();
            // Atualiza apenas este registo na lista local, sem recarregar tudo
            setPresencas(prev => prev.map(p => p.id === presencaId ? updated : p));
            setEditingFaltaId(null);
            setFaltaMessage('✅ Presença atualizada com sucesso!');
            setTimeout(() => setFaltaMessage(''), 3000);
        } catch (err: any) {
            setFaltaMessage('❌ ' + (err.message || 'Erro ao atualizar presença.'));
        }
    };

    // Helper to get current datetime formatted for the input 'max' attribute
    const getCurrentDateTimeLocal = () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        return now.toISOString().slice(0, 16);
    };

    // Conta o total de faltas para o resumo
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
                    <button onClick={() => navigate(-1)} className="btn-view">← Voltar</button>
                    <div className="ver-aluno-header">
                        <div>
                            <h1>Ficha do Aluno</h1>
                            <p className="subtitle">
                                {isEditing ? 'A editar informações do aluno.' : 'Informações detalhadas do aluno selecionado.'}
                            </p>
                        </div>

                        {/* Mostra "Editar" em modo de visualização, ou "Guardar + Cancelar" em modo de edição */}
                        {!isEditing ? (
                            <button className="btn-edit" onClick={() => setIsEditing(true)}>Editar</button>
                        ) : (
                            <div className="edit-actions">
                                <button className="btn-save" onClick={handleSave} disabled={saving}>
                                    {saving ? 'A guardar...' : 'Guardar'}
                                </button>
                                <button className="btn-cancel" onClick={handleCancel}>Cancelar</button>
                            </div>
                        )}
                    </div>

                    {saveMessage && (
                        <div className={saveMessage.startsWith('✅') ? 'feedback-success' : 'feedback-error'}>
                            {saveMessage}
                        </div>
                    )}

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
                            <span className="info-label">Notas</span>
                            {/* Notas usa um textarea em vez de input para que texto longo possa ser inserido*/}
                            {isEditing
                                ? <textarea className="edit-input edit-textarea" name="notas" value={form.notas} onChange={handleChange} />
                                : <span className="info-value">{aluno.notas}</span>
                            }
                        </div>
                    </div>

                    {/* ── Secção de MSAI ── */}
                    <div className="msai-section">
                        <div className="faltas-header">
                            <h2>Medidas de Suporte à Aprendizagem e à Inclusão</h2>
                        </div>
                        <div className="msai-columns">
                            <div className="msai-column">
                                <h3>Medidas Universais</h3>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[0] === '1'} onChange={() => handleMsaiChange(0)} disabled={!isEditing} /> Diferenciação pedagógica</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[1] === '1'} onChange={() => handleMsaiChange(1)} disabled={!isEditing} /> Acomodações curriculares</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[2] === '1'} onChange={() => handleMsaiChange(2)} disabled={!isEditing} /> O enriquecimento curricular</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[3] === '1'} onChange={() => handleMsaiChange(3)} disabled={!isEditing} /> A promoção do comportamento pró-social</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[4] === '1'} onChange={() => handleMsaiChange(4)} disabled={!isEditing} /> A intervenção com foco académico ou comportamental em pequenos grupos</label>
                            </div>
                            <div className="msai-column">
                                <h3>Medidas Seletivas</h3>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[5] === '1'} onChange={() => handleMsaiChange(5)} disabled={!isEditing} /> Os percursos curriculares diferenciados</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[6] === '1'} onChange={() => handleMsaiChange(6)} disabled={!isEditing} /> As adaptações curriculares não significativas</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[7] === '1'} onChange={() => handleMsaiChange(7)} disabled={!isEditing} /> Apoio psicopedagógico</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[8] === '1'} onChange={() => handleMsaiChange(8)} disabled={!isEditing} /> A antecipação e o reforço das aprendizagens</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[9] === '1'} onChange={() => handleMsaiChange(9)} disabled={!isEditing} /> O apoio tutorial</label>
                            </div>
                            <div className="msai-column">
                                <h3>Medidas Adicionais</h3>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[10] === '1'} onChange={() => handleMsaiChange(10)} disabled={!isEditing} /> A frequência do ano de escolaridade por disciplinas</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[11] === '1'} onChange={() => handleMsaiChange(11)} disabled={!isEditing} /> As adaptações curriculares significativas</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[12] === '1'} onChange={() => handleMsaiChange(12)} disabled={!isEditing} /> O plano individual de transição</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[13] === '1'} onChange={() => handleMsaiChange(13)} disabled={!isEditing} /> O desenvolvimento de metodologias e estratégias de ensino estruturado</label>
                                <label className="msai-checkbox"><input type="checkbox" checked={msai[14] === '1'} onChange={() => handleMsaiChange(14)} disabled={!isEditing} /> O desenvolvimento de competências de autonomia pessoal e social</label>
                            </div>
                        </div>
                    </div>

                    {/* ── Secção de Presenças ── */}
                    <div className="faltas-section">
                        <div className="faltas-header">
                            <div>
                                <h2>Presenças</h2>
                                {!loadingFaltas && (
                                    <p className="faltas-summary">
                                        {totalFaltas === 0
                                            ? 'Sem faltas registadas.'
                                            : `${totalFaltas} falta${totalFaltas > 1 ? 's' : ''} registada${totalFaltas > 1 ? 's' : ''}`}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Mensagem de feedback após adicionar uma presença */}
                        {faltaMessage && (
                            <div className={faltaMessage.startsWith('✅') ? 'feedback-success' : 'feedback-error'}>
                                {faltaMessage}
                            </div>
                        )}

                        {/* Lista de presenças */}
                        {loadingFaltas ? (
                            <p className="faltas-loading">A carregar faltas...</p>
                        ) : presencas.length === 0 ? (
                            <p className="faltas-empty">Nenhum registo encontrado.</p>
                        ) : (
                            <div className="faltas-list">
                                <div className="falta-row falta-row-header">
                                    <span>Data</span>
                                    <span>Estado</span>
                                    <span>Justificada</span>
                                    <span></span>
                                </div>
                                {presencas.map((p) => (
                                    <div key={p.id} className={`falta-row ${!p.presente ? 'falta-row-absent' : ''}`} style={{ gridTemplateColumns: '1fr 1fr 1fr auto' }}>
                                        <span>{formatDate(p.data)}</span>
                                        <span className={p.presente ? 'badge-presente' : 'badge-falta'}>
                                            {p.presente ? '✅ Presente' : '❌ Falta'}
                                        </span>
                                        <span>{!p.presente ? (p.justifica ? 'Sim' : 'Não') : '—'}</span>

                                        {/* Botão de edição — só aparece em faltas (não em presenças) */}
                                        <span>
                                            {!p.presente && editingFaltaId !== p.id && (
                                                <button
                                                    className="btn-edit-falta"
                                                    onClick={() => setEditingFaltaId(p.id)}
                                                    title="Editar justificação"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                            {!p.presente && editingFaltaId === p.id && (
                                                <div className="falta-inline-edit">
                                                    <button
                                                        className="toggle-btn toggle-active"
                                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                                        onClick={() => handleJustificar(p.id, !p.justifica)}
                                                    >
                                                        {p.justifica ? 'Marcar ✗' : 'Justificar ✓'}
                                                    </button>
                                                    <button
                                                        className="btn-cancel"
                                                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                                                        onClick={() => setEditingFaltaId(null)}
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            )}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Formulário para registar uma nova presença */}
                        {showFaltaForm && (
                            <div className="falta-form">
                                <p className="falta-form-title">Registar nova presença</p>

                                {/* Date and time picker */}
                                <div className="form-group">
                                    <label className="info-label">Data e Hora (opcional)</label>
                                    <input
                                        type="datetime-local"
                                        className="edit-input"
                                        value={novaFalta.data}
                                        max={getCurrentDateTimeLocal()}
                                        onChange={e => setNovaFalta({ ...novaFalta, data: e.target.value })}
                                    />
                                </div>

                                <div className="falta-toggle">
                                    <button
                                        className={`toggle-btn ${novaFalta.presente ? 'toggle-active' : ''}`}
                                        onClick={() => setNovaFalta({ ...novaFalta, presente: true, justifica: false })}
                                    >
                                        ✅ Presente
                                    </button>
                                    <button
                                        className={`toggle-btn ${!novaFalta.presente ? 'toggle-active' : ''}`}
                                        onClick={() => setNovaFalta({ ...novaFalta, presente: false })}
                                    >
                                        ❌ Falta
                                    </button>
                                </div>

                                {/* Checkbox "Justificada" */}
                                {!novaFalta.presente && (
                                    <label className="falta-check-label">
                                        <input
                                            type="checkbox"
                                            checked={novaFalta.justifica}
                                            onChange={e => setNovaFalta({ ...novaFalta, justifica: e.target.checked })}
                                        />
                                        Falta justificada
                                    </label>
                                )}

                                <div className="falta-form-actions">
                                    <button className="btn-save" onClick={handleAddFalta} disabled={addingFalta}>
                                        {addingFalta ? 'A registar...' : 'Confirmar'}
                                    </button>
                                    <button className="btn-cancel" onClick={() => setShowFaltaForm(false)}>Cancelar</button>
                                </div>
                            </div>
                        )}

                        {!showFaltaForm && (
                            <button className="btn-add-falta" onClick={() => setShowFaltaForm(true)}>
                                + Registar Presença
                            </button>
                        )}
                    </div>
                </div>) : (
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
