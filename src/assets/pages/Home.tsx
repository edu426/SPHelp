import './Home.css'
import { Link } from 'react-router-dom';
import { useUser, SignInButton } from '@clerk/clerk-react';

function Home() {
    const { isSignedIn } = useUser();

    return (
        <div className="home-container">
            {/* Animated Background Blobs */}
            <div className="bg-blobs">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
            </div>

            <section className="hero">
                <div className="hero-content">
                    <h1 className="hero-title">A sua plataforma de<br />Gestão Educativa</h1>
                    <p className="hero-subtitle">
                        Simplifique o dia a dia da educação especial. Faça a gestão dos seus alunos, diagnósticos e relatórios num único local, de forma simples e intuitiva.
                    </p>
                    {isSignedIn ? (
                        <Link to="/dashboard" className="btn-primary glass-btn">
                            Entrar na aplicação <span className="material-symbols-outlined icon-right">arrow_forward</span>
                        </Link>
                    ) : (
                        <SignInButton>
                            <button className="btn-primary glass-btn">
                                Entrar na aplicação <span className="material-symbols-outlined icon-right">arrow_forward</span>
                            </button>
                        </SignInButton>
                    )}
                </div>
                <div className="hero-image">
                    <img id="laptop" className="floating-img laptop-img" src="src/assets/images/laptop_early.png" alt="Inclui + Dashboard Preview" />
                    <img id="phone" className="floating-img phone-img" src="src/assets/images/phone.png" alt="Inclui + Dashboard Preview mobile" />
                </div>
            </section>

            {/* Como Funciona Timeline */}
            <section className="how-it-works">
                <h2 className="section-title">Como Funciona?</h2>
                <div className="timeline-grid">
                    <div className="timeline-step">
                        <div className="step-number">1</div>
                        <div className="step-icon">
                            <span className="material-symbols-outlined">person_add</span>
                        </div>
                        <h3>Registar Alunos</h3>
                        <p>Crie perfis completos com diagnósticos e informações importantes para acesso rápido.</p>
                    </div>
                    <div className="timeline-connector"></div>
                    <div className="timeline-step">
                        <div className="step-number">2</div>
                        <div className="step-icon">
                            <span className="material-symbols-outlined">analytics</span>
                        </div>
                        <h3>Acompanhar Progresso</h3>
                        <p>Registe presenças, atividades concluídas e medidas MSAI ativas diariamente.</p>
                    </div>
                    <div className="timeline-connector"></div>
                    <div className="timeline-step">
                        <div className="step-number">3</div>
                        <div className="step-icon">
                            <span className="material-symbols-outlined">description</span>
                        </div>
                        <h3>Gerar Relatórios</h3>
                        <p>Exporte todos os dados dos seus alunos para Excel com um único clique.</p>
                    </div>
                </div>
            </section>

            {/* Impacto */}
            <section className="impact">
                <div className="impact-content">
                    <h2>Mais tempo para o que importa.</h2>
                    <p>Inclui + foi desenhado para eliminar a carga burocrática, permitindo que se foque no ensino e no apoio direto aos seus alunos.</p>
                    <div className="impact-stats">
                        <div className="impact-stat">
                            <h3>100%</h3>
                            <p>Informação Centralizada</p>
                        </div>
                        <div className="impact-stat">
                            <h3>-5h</h3>
                            <p>Poupadas em Relatórios/Mês</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="features">
                <div className="features-grid">
                    <div className="feature-card">
                        <div className="feature-icon">
                            <span className="material-symbols-outlined">groups</span>
                        </div>
                        <h3>Gestão de turmas</h3>
                        <p>Organize facilmente as suas turmas e alunos de educação especial. Mantenha todas as informações vitais acessíveis.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <span className="material-symbols-outlined">edit_document</span>
                        </div>
                        <h3>Registo de diagnósticos e presenças</h3>
                        <p>Acompanhe o progresso contínuo. Registe avaliações e assiduidade de forma rápida para cada aluno.</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-icon">
                            <span className="material-symbols-outlined">download</span>
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