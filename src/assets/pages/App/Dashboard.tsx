import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import './Dashboard.css'
import IsLoggedIn from "../../functions/IsLoggedIn";
import { Link } from "react-router-dom";

interface AlunoRecente {
    id: string;
    nome: string;
    turma: string;
    foto?: string;
    updatedAt: string;
}

function Dashboard() {
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);
    const [alunosRecentes, setAlunosRecentes] = useState<AlunoRecente[]>([]);
    const [loadingAlunos, setLoadingAlunos] = useState(false);

    // Sincroniza o utilizador e guarda o professorId
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

    // Quando temos o professorId, busca os alunos mais recentes
    useEffect(() => {
        if (!professorId) return;
        console.log(professorId);
        setLoadingAlunos(true);
        fetch(`/api/alunos/recentes/${professorId}`)
            .then((res) => res.json())
            .then((data) => setAlunosRecentes(data))
            .catch((err) => console.error("Erro ao buscar alunos recentes:", err))
            .finally(() => setLoadingAlunos(false));
    }, [professorId]);

    // Formata a data de forma relativa (ex: "há 2 horas")
    const formatRelative = (iso: string) => {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Agora mesmo';
        if (mins < 60) return `Há ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `Há ${hours}h`;
        const days = Math.floor(hours / 24);
        return `Há ${days} dia${days > 1 ? 's' : ''}`;
    };

    // Gera as iniciais do nome do aluno
    const getInitials = (nome: string) =>
        nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    return (
        <IsLoggedIn>
            <div>
                <section className="hero">
                    <div className="hero-content">
                        <h1>Bem vindo {user?.firstName}</h1>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link to="/adicionar-aluno" className="btn btn-hero" style={{ backgroundColor: 'transparent', border: '2px solid #1a1a1a', color: '#1a1a1a' }}>+ Adicionar Aluno</Link>
                            <Link to="/ver-todos-alunos" className="btn btn-hero" style={{ backgroundColor: 'transparent', border: '2px solid #1a1a1a', color: '#1a1a1a' }}>Ver Todos os Alunos</Link>
                            <Link to="/excel-test" className="btn btn-hero" style={{ backgroundColor: 'transparent', border: '2px solid #1a1a1a', color: '#1a1a1a' }}>Exportar para Excel</Link>
                        </div>
                    </div>
                </section>

                <section className="features">
                    <div className="recent-header">
                        <h2>Alunos</h2>
                        <Link to="/ver-todos-alunos" className="recent-ver-todos">Ver todos →</Link>
                    </div>
                    <p className="recent-subtitle">Alunos editados recentemente</p>

                    {loadingAlunos ? (
                        <p className="recent-loading">A carregar alunos...</p>
                    ) : alunosRecentes.length === 0 ? (
                        <div className="recent-empty">
                            <p>Ainda não tens alunos registados.</p>
                            <Link to="/adicionar-aluno" className="btn btn-hero" style={{ backgroundColor: 'transparent', border: '2px solid #1a1a1a', color: '#1a1a1a', display: 'inline-block', marginTop: '1rem' }}>+ Adicionar primeiro aluno</Link>
                        </div>
                    ) : (
                        <div className="recent-list">
                            {alunosRecentes.map((aluno) => (
                                <Link key={aluno.id} to={`/editar-aluno/${aluno.id}`} className="recent-card">
                                    <div className="recent-avatar">
                                        {aluno.foto
                                            ? <img src={aluno.foto} alt={`Foto de ${aluno.nome}`} />
                                            : <span>{getInitials(aluno.nome)}</span>
                                        }
                                    </div>
                                    <div className="recent-info">
                                        <span className="recent-nome">{aluno.nome}</span>
                                        <span className="recent-turma">{aluno.turma}</span>
                                    </div>
                                    <span className="recent-time">{formatRelative(aluno.updatedAt)}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </IsLoggedIn>
    );
}

export default Dashboard;