import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import IsLoggedIn from '../../functions/IsLoggedIn';
import './VerAluno.css';

interface Student {
    id: string;
    nome: string;
    email: string;
    turma: string;
    notas: string;
    professorId: string;
}

export default function VerAluno() {
    const { id } = useParams<{ id: string }>();
    const [aluno, setAluno] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAluno = async () => {
            try {
                setLoading(true);
                const response = await fetch(`http://localhost:3000/api/alunos/detalhe/${id}`);
                if (!response.ok) throw new Error('Aluno não encontrado.');
                const data = await response.json();
                setAluno(data);
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar dados do aluno.');
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchAluno();
    }, [id]);

    if (loading) {
        return <div className="ver-aluno-loading">⏳ A carregar informações do aluno...</div>;
    }

    if (error || !aluno) {
        return <div className="ver-aluno-error">❌ {error || 'Aluno não encontrado.'}</div>;
    }

    // Get initials for the avatar
    const initials = aluno.nome
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

    return (
        <IsLoggedIn>
            <div className="ver-aluno-page">
                <Link to="/excel-test" className="back-link">← Voltar à lista</Link>

                <h1>Ficha do Aluno</h1>
                <p className="subtitle">Informações detalhadas do aluno selecionado.</p>

                <div className="aluno-card">
                    <div className="aluno-avatar">{initials}</div>

                    <div className="info-row">
                        <span className="info-label">Nome</span>
                        <span className="info-value">{aluno.nome}</span>
                    </div>

                    <div className="info-row">
                        <span className="info-label">Email</span>
                        <span className="info-value">{aluno.email}</span>
                    </div>

                    <div className="info-row">
                        <span className="info-label">Turma</span>
                        <span className="info-value">{aluno.turma}</span>
                    </div>

                    <div className="info-row">
                        <span className="info-label">Notas</span>
                        <span className="info-value">{aluno.notas}</span>
                    </div>
                </div>
            </div>
        </IsLoggedIn>
    );
}
