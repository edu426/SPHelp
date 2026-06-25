import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import './AdicionarAluno.css';
import IsLoggedIn from '../../functions/IsLoggedIn';

export default function AdicionarAluno() {
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);

    const [form, setForm] = useState({
        nome: '',
        turma: '',
        notas: '',
        estrategias: '',
        foto: '',
        dataNasc: '',
        diretorTurma: '',
        encarregado: { nome: '', tipo: '', email: '', telefone: '' }
    });

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Obter o ID do professor a partir do Clerk ID
    useEffect(() => {
        if (user) {
            fetch('/api/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clerkId: user.id }),
            })
                .then((res) => res.json())
                .then((data) => {
                    if (data.id) setProfessorId(data.id);
                })
                .catch(() => setError('Não foi possível obter os dados do professor.'));
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEncarregadoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, encarregado: { ...form.encarregado, [e.target.name]: e.target.value } });
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess('');
        setError('');

        if (!professorId) {
            setError('ID do professor não disponível. Tenta novamente.');
            return;
        }

        if (form.encarregado.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.encarregado.email)) {
            setError('Por favor, insere um e-mail válido para o encarregado de educação.');
            return;
        }

        if (form.encarregado.telefone && !/^\+?[0-9\s-]{9,}$/.test(form.encarregado.telefone)) {
            setError('Por favor, insere um número de telefone válido (mínimo 9 dígitos).');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/alunos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, professorId }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao adicionar aluno.');
            }

            setSuccess(`Aluno "${data.nome}" adicionado com sucesso!`);
            setForm({ nome: '', turma: '', notas: '', estrategias: '', foto: '', dataNasc: '', diretorTurma: '', encarregado: { nome: '', tipo: '', email: '', telefone: '' } });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <IsLoggedIn>
            <div className="add-student-page">
                <Link to="/dashboard" className="back-link">← Voltar ao Dashboard</Link>

                <h1>Adicionar Aluno</h1>
                <p className="subtitle">Preenche os dados para adicionar um novo aluno à base de dados.</p>

                <form className="add-student-form" onSubmit={handleSubmit}>
                    <div className="add-student-layout">
                        {/* ── Esquerda: Informações do Aluno ── */}
                        <div className="add-student-card student-info-card">
                            <h2 style={{ marginBottom: '1.5rem', color: '#1a1a1a', fontSize: '1.3rem' }}>Dados do Aluno</h2>
                            <div className="form-group">
                                <label htmlFor="nome">Nome</label>
                                <input
                                    id="nome"
                                    name="nome"
                                    type="text"
                                    placeholder="Ex: João Silva"
                                    value={form.nome}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="turma">Turma</label>
                                <input
                                    id="turma"
                                    name="turma"
                                    type="text"
                                    placeholder="Ex: 10A"
                                    value={form.turma}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="dataNasc">Data de Nascimento</label>
                                <input
                                    id="dataNasc"
                                    name="dataNasc"
                                    type="date"
                                    value={form.dataNasc}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="diretorTurma">Diretor de Turma</label>
                                <input
                                    id="diretorTurma"
                                    name="diretorTurma"
                                    type="text"
                                    placeholder="Ex: Prof. Maria"
                                    value={form.diretorTurma}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="notas">Diagnóstico (Opcional)</label>
                                <textarea
                                    id="notas"
                                    name="notas"
                                    placeholder="Ex: TDAH"
                                    value={form.notas}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="estrategias">Estratégias de Intervenção (Opcional)</label>
                                <textarea
                                    id="estrategias"
                                    name="estrategias"
                                    placeholder="Ex: Sentar na fila da frente..."
                                    value={form.estrategias}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="foto">Fotografia de Perfil (Opcional)</label>
                                <input
                                    id="foto"
                                    name="foto"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                                {form.foto && (
                                    <div style={{ marginTop: '10px' }}>
                                        <img src={form.foto} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '50%' }} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Direita: Encarregado de Educação ── */}
                        <div className="add-student-card encarregado-card">
                            <h2 style={{ marginBottom: '1.5rem', color: '#1a1a1a', fontSize: '1.3rem' }}>Encarregado de Educação</h2>

                            <div className="form-group">
                                <label htmlFor="encarregadoNome">Nome do Encarregado</label>
                                <input
                                    id="encarregadoNome"
                                    name="nome"
                                    type="text"
                                    placeholder="Ex: Maria Santos"
                                    value={form.encarregado.nome}
                                    onChange={handleEncarregadoChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="encarregadoTipo">Parentesco</label>
                                <input
                                    id="encarregadoTipo"
                                    name="tipo"
                                    type="text"
                                    placeholder="Ex: Mãe, Pai, Tutor"
                                    value={form.encarregado.tipo}
                                    onChange={handleEncarregadoChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="encarregadoEmail">E-mail</label>
                                <input
                                    id="encarregadoEmail"
                                    name="email"
                                    type="email"
                                    placeholder="Ex: maria.santos@email.com"
                                    value={form.encarregado.email}
                                    onChange={handleEncarregadoChange}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="encarregadoTelefone">Contacto Telefónico</label>
                                <input
                                    id="encarregadoTelefone"
                                    name="telefone"
                                    type="tel"
                                    placeholder="Ex: 912345678"
                                    value={form.encarregado.telefone}
                                    onChange={handleEncarregadoChange}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2.5rem' }}>
                        <button type="submit" className="btn-submit btn-large" disabled={loading}>
                            {loading ? 'A guardar...' : 'Adicionar Aluno'}
                        </button>
                    </div>
                </form>

                <div className="feedback-messages" style={{ marginTop: '1rem' }}>
                    {success && (
                        <div className="feedback-success">
                            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '5px', fontSize: '1.2rem' }}>check_circle</span>
                            {success}
                        </div>
                    )}
                    {error && (
                        <div className="feedback-error">
                            <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '5px', fontSize: '1.2rem' }}>error</span>
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </IsLoggedIn>
    );
}
