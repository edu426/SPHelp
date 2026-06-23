import { Outlet } from 'react-router-dom';
import './MainHeader.css'
import { SignInButton, useUser, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

function MainHeader() {
    const { isSignedIn } = useUser();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <header>
                <Link to="/dashboard" className="logo">
                    <img src="/src/assets/images/inclmais-removebg-preview.png" alt="Inclui+" className="logo-img" />
                    <span className="logo-text">Inclui +</span>
                </Link>
                <nav className="nav-links">
                    <Link to="/ajuda" className="nav-link" id="ajuda">Ajuda</Link>
                    {isSignedIn ? (
                        <div className="user-actions">
                            <Link to="/dashboard" className="btn-entrar">Dashboard</Link>
                            <UserButton afterSignOutUrl="/" />
                        </div>
                    ) : (
                        <SignInButton>
                            <a className="btn-entrar" style={{ cursor: "pointer" }}>Entrar</a>
                        </SignInButton>
                    )}
                </nav>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Outlet />
            </main>

            <footer>
                <div className="footer-links">
                    <Link to="/ajuda">Ajuda e Suporte</Link>
                    <a href="#">Política de Privacidade</a>
                    <a href="#">Contacto</a>
                </div>
                <div className="footer-info">
                    <p>Desenvolvido para apoiar os profissionais de Educação Especial.</p>
                </div>
            </footer>
        </div>
    );
}

export default MainHeader;