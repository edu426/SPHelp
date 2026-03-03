import { useUser } from "@clerk/clerk-react";
import { useEffect } from "react";
import './Dashboard.css'
import { Link } from "react-router-dom";

function Dashboard() {
    const { user } = useUser();


    useEffect(() => {
        // Verifica se o utilizador está autenticado
        if (user) {
            fetch("http://localhost:3000/api/sync", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clerkId: user.id,
                }),
            })
                .then((res) => res.json())
                .then((data) => {
                    console.log("Sincronizado com sucesso:", data);
                })
                .catch((err) => {
                    console.error("Erro ao sincronizar:", err);
                });
        }
    }, [user]);
    return (
        <div>

            <section className="hero">
                <div className="hero-content">
                    <h1>Bem vindo {user?.firstName}</h1>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <Link to="/adicionar-aluno" className="btn btn-hero">+ Adicionar Aluno</Link>
                        <Link to="/excel-test" className="btn btn-hero" style={{ backgroundColor: 'transparent', border: '2px solid #1a1a1a', color: '#1a1a1a' }}>Exportar para Excel</Link>
                    </div>
                </div>
            </section>

            <section className="features">
                <h2>Alunos</h2>
                <div className="features-grid">
                    <div className="feature-card">
                        <i className="fa-solid fa-building-columns fa-3x"></i>
                        <h3>Gestão de turmas</h3>
                        <p>Cria e organiza as tuas turmas facilmente</p>
                    </div>

                    <div className="feature-card">
                        <i className="fa-solid fa-clipboard fa-3x"></i>
                        <h3>Registo de notas e presenças</h3>
                        <p>Tudo num só lugar</p>
                    </div>

                    <div className="feature-card">
                        <i className="fa-solid fa-table fa-3x"></i>
                        <h3>Exportação em Excel</h3>
                        <p>Exporta dados com um clique</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Dashboard;