import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export default function VerTodosAluno() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch alunos do backend
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:3000/api/alunos');
                if (!response.ok) throw new Error('Failed to fetch students');
                const data = await response.json();
                setStudents(data);
            } catch (err: any) {
                setError('Could not connect to backend. Make sure it is running on port 3000.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    if (loading) {
        return <div className="ver-aluno-loading"> A carregar informações do aluno...</div>;
    }

    if (error || !students) {
        return <div className="ver-aluno-error"> {error || 'Ainda não existem alunos.'}</div>;
    }

    return (
        <IsLoggedIn>
            <div className="ver-todos-page">
                <Link to="/dashboard" className="back-link">← Voltar ao Dashboard</Link>

                <h1>Todos os Alunos</h1>

                <div className="alunos-grid">
                    {students.map((student) => (
                        <div className="aluno-card-mini" key={student.id}>

                            <div className="info-row">
                                <span className="info-label">Nome</span>
                                <span className="info-value">{student.nome}</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Email</span>
                                <span className="info-value">{student.email}</span>
                            </div>

                            <div className="info-row">
                                <span className="info-label">Turma</span>
                                <span className="info-value">{student.turma}</span>
                            </div>
                            <Link to={`/editar-aluno/${student.id}`} className="btn btn-view">
                                Editar
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </IsLoggedIn>
    );
}
