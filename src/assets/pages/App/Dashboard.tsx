
import './Dashboard.css'

function Dashboard() {
    return (
        <div>

            <section className="hero">
                <div className="hero-content">
                    <h1>Bem vindo nome</h1>
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