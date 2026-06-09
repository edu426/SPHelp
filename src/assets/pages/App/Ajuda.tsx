import { useState } from 'react';
import './Ajuda.css';
import IsLoggedIn from '../../functions/IsLoggedIn';

export default function Ajuda() {
    const [openFaq, setOpenFaq] = useState<number | null>(null);
    const [contactForm, setContactForm] = useState({ assunto: '', mensagem: '' });
    const [isSending, setIsSending] = useState(false);
    const [sendMsg, setSendMsg] = useState('');

    const faqs = [
        {
            q: "Como adiciono e edito as informações de um aluno?",
            a: "Podes adicionar um aluno indo ao 'Dashboard' e clicando no botão '+ Novo Aluno'. Depois, podes clicar no botão de 'Editar' na ficha desse aluno para alterar as suas informações ou registar medidas."
        },
        {
            q: "Como funciona a exportação de dados para Excel?",
            a: "Na ficha detalhada de qualquer aluno, existe um botão 'Exportar' no canto superior direito. Ao clicares, será gerado um ficheiro Excel formatado com os dados do aluno, o seu diagnóstico, medidas aplicadas e o histórico de presenças."
        },
        {
            q: "Como registo faltas ou presenças nas aulas?",
            a: "Na ficha do aluno, existe uma secção de 'Aulas'. Clica em '+ Registar Aula' e preenche a data, o sumário da sessão, e se o aluno esteve presente ou não. Se o aluno faltar, podes mais tarde justificar a falta."
        }
    ];

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    const handleContactSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        // Simulando envio
        setTimeout(() => {
            setIsSending(false);
            setSendMsg("Mensagem enviada com sucesso! A nossa equipa entrará em contacto brevemente.");
            setContactForm({ assunto: '', mensagem: '' });
            setTimeout(() => setSendMsg(''), 5000);
        }, 1500);
    };

    return (
        <IsLoggedIn>
            <div className="ajuda-page">
                <div className="ajuda-header">
                    <h1>Central de Ajuda</h1>
                    <p className="ajuda-subtitle">Tens dúvidas ou encontraste um problema? Estamos aqui para ajudar.</p>
                </div>

                <div className="ajuda-grid">
                    {/* Coluna Esquerda */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="ajuda-section">
                            <h2>
                                <span className="material-symbols-outlined" style={{ color: '#f4d77e' }}>help</span>
                                Perguntas Frequentes (FAQ)
                            </h2>
                            <div className="faq-list">
                                <div className="faq-item">
                                    <div
                                        className={`faq-question ${openFaq === 0 ? 'open' : ''}`}
                                        onClick={() => toggleFaq(0)}
                                    >
                                        {faqs[0].q}
                                        <span className="material-symbols-outlined">
                                            expand_more
                                        </span>
                                    </div>
                                    <div className={`faq-answer ${openFaq === 0 ? 'open' : ''}`}>
                                        {faqs[0].a}
                                    </div>
                                </div>
                                <div className="faq-item">
                                    <div
                                        className={`faq-question ${openFaq === 1 ? 'open' : ''}`}
                                        onClick={() => toggleFaq(1)}
                                    >
                                        {faqs[1].q}
                                        <span className="material-symbols-outlined">
                                            expand_more
                                        </span>
                                    </div>
                                    <div className={`faq-answer ${openFaq === 1 ? 'open' : ''}`}>
                                        {faqs[1].a}
                                    </div>
                                </div>
                                <div className="faq-item">
                                    <div
                                        className={`faq-question ${openFaq === 2 ? 'open' : ''}`}
                                        onClick={() => toggleFaq(2)}
                                    >
                                        {faqs[2].q}
                                        <span className="material-symbols-outlined">
                                            expand_more
                                        </span>
                                    </div>
                                    <div className={`faq-answer ${openFaq === 2 ? 'open' : ''}`}>
                                        {faqs[2].a}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="ajuda-section">
                    <h2>
                        <span className="material-symbols-outlined" style={{ color: '#10b981' }}>library_books</span>
                        Referência Rápida MSAI
                    </h2>
                    <div className="msai-ref-list">
                        <div className="msai-ref-item">
                            <h3>Medidas Universais</h3>
                            <p>Respostas educativas que visam promover a participação e a melhoria das aprendizagens de todos os alunos, incluindo a diferenciação pedagógica e as acomodações curriculares.</p>
                        </div>
                        <div className="msai-ref-item">
                            <h3>Medidas Seletivas</h3>
                            <p>Medidas aplicadas a alunos com necessidades de suporte adicionais, abrangendo apoio psicopedagógico ou percursos diferenciados que não impliquem adaptações significativas.</p>
                        </div>
                        <div className="msai-ref-item">
                            <h3>Medidas Adicionais</h3>
                            <p>Medidas focadas nas necessidades específicas e severas, que incluem adaptações curriculares significativas ou planos individuais de transição.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Coluna Direita */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="ajuda-section">
                    <h2>
                        <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>support_agent</span>
                        Contactar Suporte
                    </h2>
                    <form className="contact-form" onSubmit={handleContactSubmit}>
                        <div className="contact-group">
                            <label>Assunto</label>
                            <input
                                type="text"
                                className="contact-input"
                                placeholder="Ex: Dúvida sobre exportação..."
                                required
                                value={contactForm.assunto}
                                onChange={e => setContactForm({ ...contactForm, assunto: e.target.value })}
                            />
                        </div>
                        <div className="contact-group">
                            <label>Mensagem</label>
                            <textarea
                                className="contact-input textarea"
                                placeholder="Descreve o teu problema ou sugestão em detalhe..."
                                required
                                value={contactForm.mensagem}
                                onChange={e => setContactForm({ ...contactForm, mensagem: e.target.value })}
                            ></textarea>
                        </div>
                        <button type="submit" className="btn-submit-contact" disabled={isSending}>
                            {isSending ? (
                                <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span> A Enviar...</>
                            ) : (
                                <><span className="material-symbols-outlined">send</span> Enviar Mensagem</>
                            )}
                        </button>
                        {sendMsg && <p style={{ color: '#10b981', fontWeight: 'bold', marginTop: '10px', textAlign: 'center' }}>{sendMsg}</p>}
                    </form>
                </div>

                <div className="ajuda-section" style={{ backgroundColor: '#222', color: '#fff' }}>
                    <h2 style={{ color: '#fff' }}>
                        <span className="material-symbols-outlined" style={{ color: '#f4d77e' }}>lock</span>
                        Privacidade e Segurança
                    </h2>
                    <p style={{ color: '#ccc', lineHeight: '1.6' }}>
                        A privacidade dos alunos é a nossa principal prioridade. Todos os diagnósticos e relatórios inseridos no sistema são encriptados e acessíveis <strong>exclusivamente por ti</strong>. Nunca partilhamos ou analisamos dados de identificação pessoal dos alunos.
                    </p>
                </div>
            </div>
        </IsLoggedIn >
    );
}
