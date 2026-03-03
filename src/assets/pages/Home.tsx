
import './Home.css'
import { Link } from 'react-router-dom';
import { useUser, SignInButton } from '@clerk/clerk-react';

function Home() {
    const { isSignedIn } = useUser();

    return (
        <div>

            <section className="hero">
                <div className="hero-content">
                    <h1>Bem-vindo ao SPHelp, o teu assistente digital para gerir alunos e turmas</h1>
                    <p>Com SPHelp, gerir turmas e alunos nunca foi tão simples.</p>
                    <p>Regista-te agora e experimenta a diferença!</p>
                    {isSignedIn ? (
                        <Link to="/dashboard" className="btn btn-hero">Entrar na aplicação</Link>
                    ) : (
                        <SignInButton>
                            <a className="btn btn-hero">Entrar na aplicação</a>
                        </SignInButton>
                    )}
                </div>
                <div className="hero-image">
                    <img src="src/assets/images/laptop.png" />
                </div>
            </section>

            <section className="features">
                <h2>O que faz</h2>
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

export default Home;