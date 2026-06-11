import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import './Dashboard.css'
import IsLoggedIn from "../../functions/IsLoggedIn";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AlunoRecente {
    id: string;
    nome: string;
    turma: string;
    foto?: string;
    updatedAt: string;
}

interface DashboardStats {
    totalAlunos: number;
    atividadesPendentes: number;
    faltasPorJustificar: number;
    msai: {
        universais: number;
        seletivas: number;
        adicionais: number;
    }
}

export default function Dashboard() {
    const { user } = useUser();
    const [professorId, setProfessorId] = useState<string | null>(null);
    const [alunosRecentes, setAlunosRecentes] = useState<AlunoRecente[]>([]);
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(false);

    // Sincroniza o utilizador e guarda o professorId
    useEffect(() => {
        if (user) {
            fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clerkId: user.id,
                    email: user.primaryEmailAddress?.emailAddress,
                    firstName: user.firstName || 'Professor',
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    setProfessorId(data.id);
                })
                .catch((err) => {
                    console.error("Erro ao sincronizar:", err);
                });
        }
    }, [user]);

    // Busca os dados da dashboard
    useEffect(() => {
        if (!professorId) return;
        setLoading(true);

        Promise.all([
            fetch(`/api/alunos/recentes/${professorId}`).then(res => res.json()),
            fetch(`/api/dashboard/${professorId}`).then(res => res.json())
        ])
            .then(([alunosData, statsData]) => {
                setAlunosRecentes(alunosData);
                setStats(statsData);
            })
            .catch((err) => console.error("Erro ao carregar dados:", err))
            .finally(() => setLoading(false));
    }, [professorId]);

    // Formata a data de forma relativa
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

    const getInitials = (nome: string) =>
        nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

    const msaiData = stats ? [
        { name: 'Universais', value: stats.msai.universais, color: '#10b981' },
        { name: 'Seletivas', value: stats.msai.seletivas, color: '#3b82f6' },
        { name: 'Adicionais', value: stats.msai.adicionais, color: '#8b5cf6' }
    ].filter(d => d.value > 0) : [];

    return (
        <IsLoggedIn>
            <div className="dashboard-container">
                {/* ── Top Header & Actions ── */}
                <header className="dashboard-header">
                    <div>
                        <h1 className="welcome-text">Olá, {user?.firstName} 👋</h1>
                        <p className="welcome-subtext">Aqui está o resumo das tuas turmas.</p>
                    </div>
                    <div className="quick-actions">
                        <Link to="/adicionar-aluno" className="btn-action primary">
                            <span className="material-symbols-outlined">person_add</span>
                            Adicionar Aluno
                        </Link>
                        <Link to="/ver-todos-alunos" className="btn-action secondary">
                            <span className="material-symbols-outlined">group</span>
                            Ver Todos
                        </Link>
                        <Link to="/excel-test" className="btn-action outline">
                            <span className="material-symbols-outlined">download</span>
                            Exportar
                        </Link>
                    </div>
                </header>

                {loading ? (
                    <div className="loading-spinner">A carregar dados...</div>
                ) : (
                    <>
                        {/* ── Quick Stats Row ── */}
                        <section className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                                    <span className="material-symbols-outlined">school</span>
                                </div>
                                <div className="stat-info">
                                    <h3>{stats?.totalAlunos || 0}</h3>
                                    <p>Total de Alunos</p>
                                </div>
                            </div>
                            
                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                                    <span className="material-symbols-outlined">pending_actions</span>
                                </div>
                                <div className="stat-info">
                                    <h3>{stats?.atividadesPendentes || 0}</h3>
                                    <p>Atividades Pendentes</p>
                                </div>
                            </div>

                            <div className="stat-card">
                                <div className="stat-icon" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                                    <span className="material-symbols-outlined">warning</span>
                                </div>
                                <div className="stat-info">
                                    <h3>{stats?.faltasPorJustificar || 0}</h3>
                                    <p>Faltas por Justificar</p>
                                </div>
                            </div>
                        </section>

                        {/* ── Main Layout ── */}
                        <div className="dashboard-main-grid">
                            
                            {/* Left: Recent Students */}
                            <section className="dashboard-panel">
                                <div className="panel-header">
                                    <h2>Alunos Recentes</h2>
                                    <Link to="/ver-todos-alunos" className="link-ver-todos">Ver todos →</Link>
                                </div>
                                
                                {alunosRecentes.length === 0 ? (
                                    <div className="empty-state">
                                        <p>Ainda não tens alunos registados.</p>
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

                            {/* Right: MSAI Chart */}
                            <section className="dashboard-panel">
                                <div className="panel-header">
                                    <h2>Distribuição MSAI</h2>
                                </div>
                                {msaiData.length === 0 ? (
                                    <div className="empty-state">
                                        <p>Nenhuma medida MSAI ativa registada.</p>
                                    </div>
                                ) : (
                                    <div className="chart-container" style={{ width: '100%', height: 300 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={msaiData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    animationDuration={800}
                                                >
                                                    {msaiData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    itemStyle={{ fontWeight: 600 }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </section>
                        </div>
                    </>
                )}
            </div>
        </IsLoggedIn>
    );
}