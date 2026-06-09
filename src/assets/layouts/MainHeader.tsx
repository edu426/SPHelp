import { Outlet } from 'react-router-dom';
import './MainHeader.css'
import { SignInButton, useUser, UserButton } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';

function MainHeader() {
    const { isSignedIn } = useUser();

    return (
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <header>
                <Link to="/dashboard" className="logo" style={{ backgroundColor: '#222222'}}>
                    <img src="/src/assets/images/SPHELP_noBG.png" alt="SPHELP" width={60} height={50} />
                    SPHelp
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
                    <p>&copy; 2024 SPHelp. Todos os direitos reservados.</p>
                    <p>Desenvolvido para apoiar os profissionais de Educação Especial.</p>
                </div>
            </footer>
        </div>
    );
}

export default MainHeader;