import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import IsLoggedIn from '../../functions/IsLoggedIn';
import './VerAluno.css';
import { useUser } from '@clerk/clerk-react';

interface Student {
    id: string;
    nome: string;
    turma: string;
    notas: string;
    professorId: string;
    foto?: string;
}

export default function VerTodosAluno() {
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(''); // nao utilizado ate agora

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [filterTurma, setFilterTurma] = useState('');


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

    // Fetch alunos do backend
    useEffect(() => {
        if (!professorId) return;
        console.log(professorId);
        setLoading(true);
        fetch(`/api/alunos/${professorId}`)
            .then((res) => res.json())
            .then((data) => setStudents(data))
            .catch((err) => console.error("Erro ao buscar alunos:", err))
            .finally(() => setLoading(false));
    }, [professorId]);

    // Unique list of turmas for the filter dropdown
    const turmas = useMemo(() =>
        [...new Set(students.map(s => s.turma))].sort()
        , [students]);

    // Filtered list — updates instantly as user types or picks a turma
    const filteredStudents = useMemo(() => {
        return students.filter(s => {
            const matchesName = s.nome.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTurma = filterTurma === '' || s.turma === filterTurma;
            return matchesName && matchesTurma;
        });
    }, [students, searchQuery, filterTurma]);

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

                <div className="ver-aluno-header">
                    <div>
                        <h1>Todos os Alunos</h1>
                        <p className="subtitle">
                            {filteredStudents.length === students.length
                                ? `${students.length} aluno${students.length !== 1 ? 's' : ''} registado${students.length !== 1 ? 's' : ''}.`
                                : `${filteredStudents.length} de ${students.length} alunos`}
                        </p>
                    </div>
                </div>

                {/* Search and filter bar */}
                <div className="search-bar">
                    <input
                        type="text"
                        className="search-input"
                        placeholder="🔍 Pesquisar por nome..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <select
                        className="filter-select"
                        value={filterTurma}
                        onChange={e => setFilterTurma(e.target.value)}
                    >
                        <option value="">Todas as Turmas</option>
                        {turmas.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    {(searchQuery || filterTurma) && (
                        <button className="btn-clear-filter" onClick={() => { setSearchQuery(''); setFilterTurma(''); }}>
                            ✕ Limpar
                        </button>
                    )}
                </div>

                <div className="alunos-grid">
                    {filteredStudents.map((student) => {
                        const initials = student.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                        return (
                            <div className="aluno-card-mini" key={student.id}>
                                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#f4d77e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem', color: '#1a1a1a', overflow: 'hidden' }}>
                                        {student.foto ? (
                                            <img src={student.foto} alt={`Foto de ${student.nome}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            initials
                                        )}
                                    </div>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Nome</span>
                                    <span className="info-value">{student.nome}</span>
                                </div>


                                <div className="info-row">
                                    <span className="info-label">Turma</span>
                                    <span className="info-value">{student.turma}</span>
                                </div>
                                <Link to={`/editar-aluno/${student.id}`} className="btn-view" style={{ textAlign: 'center', display: 'block', marginTop: '1rem' }}>
                                    Editar
                                </Link>
                            </div>
                        );
                    })}

                    {filteredStudents.length === 0 && (
                        <p className="faltas-empty">Nenhum aluno encontrado.</p>
                    )}
                </div>
            </div>
        </IsLoggedIn>
    );
}
