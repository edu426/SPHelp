import './Home.css'
import { Link } from 'react-router-dom';
import { useUser, SignInButton } from '@clerk/clerk-react';

function Home() {
    const { isSignedIn } = useUser();

    return (
        <div>
            <section className="hero">
                <div className="hero-content">
                    <h1>A sua plataforma de<br />Gestão Educativa</h1>
                    <p>Simplifique o dia a dia da educação especial. Faça a gestão das suas turmas, alunos, notas e assiduidade num único local, de forma simples e intuitiva.</p>
                    {isSignedIn ? (
                        <Link to="/dashboard" className="btn-primary">Entrar na aplicação <i className="ri-arrow-right-line" style={{ verticalAlign: "middle", marginLeft: "8px" }}></i></Link>
                    ) : (
                        <SignInButton>
                            <a className="btn-primary" style={{ cursor: "pointer" }}>Entrar na aplicação <i className="ri-arrow-right-line" style={{ verticalAlign: "middle", marginLeft: "8px" }}></i></a>
                        </SignInButton>
                    )}
                </div>
                <div className="hero-image">
                    <img id="laptop" src="src/assets/images/laptop_early.png" alt="SPHelp Dashboard Preview" width="1899" height="886" />
                    <img id="phone" src="src/assets/images/phone.png" alt="SPHelp Dashboard Preview mobile" />
                </div>
            </section>

            <section className="features">
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <i className="ri-team-line"></i>
                        </div>
                        <h3>Gestão de turmas</h3>
                        <p>Organize facilmente as suas turmas e alunos de educação especial. Mantenha todas as informações vitais acessíveis.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <i className="ri-file-edit-line"></i>
                        </div>
                        <h3>Registo de notas e presenças</h3>
                        <p>Acompanhe o progresso contínuo. Registe avaliações e assiduidade de forma rápida para cada aluno.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <i className="ri-file-excel-2-line"></i>
                        </div>
                        <h3>Exportação em Excel</h3>
                        <p>Exporte todos os dados consolidados para formato Excel com um único clique para análises detalhadas.</p>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default Home;