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
        foto: '',
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

            setSuccess(`✅ Aluno "${data.nome}" adicionado com sucesso!`);
            setForm({ nome: '', turma: '', notas: '', foto: '' });
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

                <div className="add-student-card">
                    <form className="add-student-form" onSubmit={handleSubmit}>
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
                            <label htmlFor="notas">Notas</label>
                            <textarea
                                id="notas"
                                name="notas"
                                placeholder="Ex: 15, 18, 12..."
                                value={form.notas}
                                onChange={handleChange}
                                required
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

                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'A guardar...' : 'Adicionar Aluno'}
                        </button>
                    </form>

                    {success && <div className="feedback-success">{success}</div>}
                    {error && <div className="feedback-error">{error}</div>}
                </div>
            </div>
        </IsLoggedIn>
    );
}
