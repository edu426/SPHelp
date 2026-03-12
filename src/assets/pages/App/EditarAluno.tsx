import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import IsLoggedIn from '../../functions/IsLoggedIn';
import './VerAluno.css';

// Defines the shape of a Student object (same as the DB model)
interface Student {
    id: string;
    nome: string;
    email: string;
    turma: string;
    notas: string;
    professorId: string;
}

export default function EditarAluno() {
    // Get id
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    // Guarda os dados do aluno
    const [aluno, setAluno] = useState<Student | null>(null);

    // Controla o loading e o error durante o fetch
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);

    // Guarda os valores iniciais enquanto se edita
    const [form, setForm] = useState({ nome: '', email: '', turma: '', notas: '' });

    // Espera q o PUT acabe
    const [saving, setSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');

    // Fetch
    useEffect(() => {
        const fetchAluno = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:3000/api/alunos/detalhe/${id}`);
                if (!response.ok) throw new Error('Aluno não encontrado.');
                const data = await response.json();

                setAluno(data);

                // insere os valores iniciais nos campos
                setForm({ nome: data.nome, email: data.email, turma: data.turma, notas: data.notas });
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados do aluno.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAluno();
    }, [id]);

    // Chamado a cada toque no teclado em qualquer campo.
    // Atualiza apenas o campo alterado dentro do objeto `form`.
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // Envia os dados para o PUT /api/alunos/:id
    const handleSave = async () => {
        setSaving(true);
        setSaveMessage('');
        try {
            const response = await fetch(`http://localhost:3000/api/alunos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form), // Envia os valores atuais do form como JSON
            });
            if (!response.ok) throw new Error('Erro ao guardar.');

            // Atualiza com a resposta do servidor
            const updated = await response.json();
            setAluno(updated);

            // Sair do modo de edição. Mensagem de sucesso por 3 segundos
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
        if (aluno) setForm({ nome: aluno.nome, email: aluno.email, turma: aluno.turma, notas: aluno.notas });
        setIsEditing(false);
    };

    // Mensagem de loading enquanto o fetch está em progresso
    if (loading) return <div className="ver-aluno-loading">A carregar informações do aluno...</div>;

    // Mensagem de erro se o aluno não foi encontrado ou o fetch falhou
    if (error || !aluno) return <div className="ver-aluno-error">{error || 'Aluno não encontrado.'}</div>;

    // Iniciais do nome do aluno (IMAGEM CIRCULAR)
    const initials = aluno.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <IsLoggedIn>
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

                <div className="aluno-card">
                    <div className="aluno-avatar">{initials}</div>

                    <div className="info-row">
                        <span className="info-label">Nome</span>
                        {isEditing
                            ? <input className="edit-input" name="nome" value={form.nome} onChange={handleChange} />
                            : <span className="info-value">{aluno.nome}</span>
                        }
                    </div>

                    <div className="info-row">
                        <span className="info-label">Email</span>
                        {isEditing
                            ? <input className="edit-input" name="email" type="email" value={form.email} onChange={handleChange} />
                            : <span className="info-value">{aluno.email}</span>
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
            </div>
        </IsLoggedIn>
    );
}
