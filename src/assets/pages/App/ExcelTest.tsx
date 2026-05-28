import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import './ExcelTest.css';
import IsLoggedIn from '../../functions/IsLoggedIn';
import { useUser } from '@clerk/clerk-react';
interface Student {
    id: string;
    nome: string;
    turma: string;
    notas: string;
    professorId: string;
    diretorTurma: string;
}

export default function ExcelTest() {
    const { user } = useUser();
    const [students, setStudents] = useState<Student[]>([]);
    const [professorId, setProfessorId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

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

    // Fetch alunos do backend
    useEffect(() => {
        if (!professorId) return;
        console.log(professorId);
        setLoading(true);
        fetch(`/api/alunos/${professorId}`)
            .then((res) => res.json())
            .then((data) => setStudents(data))
            .catch((err) => console.error("Erro ao buscar alunos:", err))
            .finally(() => setLoading(false));
    }, [professorId]);
    // Exportar todos os alunos para Excel
    const exportToExcel = () => {
        try {
            const studentData = students.map(student => ({
                'ID': student.id,
                'Nome': student.nome,
                'Turma': student.turma,
                'Diagnóstico': student.notas,
                'Diretor de turma': student.diretorTurma
            }));
            const ws = XLSX.utils.json_to_sheet(studentData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
            const date = new Date().toISOString().split('T')[0];
            const filename = `Alunos_${date}.xlsx`;
            XLSX.writeFile(wb, filename);
            setMessage(`Ficheiro Excel "${filename}" descarregado com sucesso!`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };

    // Exportar com colunas personalizadas (ainda não implementado/exemplo)
    /*
    const exportCustomColumns = () => { 
        try {
            const customData = students.map(student => ({
                'ID': student.id,
                'Nome': student.nome,
                'Email': student.email,
                'Turma': student.turma,
                'Notas': student.notas,
            }));
            const ws = XLSX.utils.json_to_sheet(customData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Alunos_Resumo');
            XLSX.writeFile(wb, 'Alunos_Resumo.xlsx');
            setMessage('Ficheiro Excel "${filename}" descarregado com sucesso!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };
*/
    // Atualizar dados
    const refreshData = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await fetch('/api/alunos');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setStudents(data);
            setMessage('Dados atualizados!');
            setTimeout(() => setMessage(''), 2000);
        } catch {
            setError('Erro ao ligar ao backend.');
        } finally {
            setLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    return (
        <IsLoggedIn>
            <div className="container">
                <h1 className="title">
                    Excel Export — Real DB Data
                </h1>

                {/* Error message */}
                {error && (
                    <div className="error-box">
                        <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '5px' }}>error</span>
                        {error}
                    </div>
                )}

                {/* Status message */}
                {message && (
                    <div className="success-box">
                        <span className="material-symbols-outlined" style={{ verticalAlign: 'middle', marginRight: '5px' }}>check_circle</span>
                        {message}
                    </div>
                )}

                {/* Export buttons */}
                <div className="button-group">
                    <button
                        onClick={exportToExcel}
                        className="btn btn-green"
                    >
                        Export All Data
                    </button>


                    {/* Exportar com colunas personalizadas (ainda não implementado/exemplo) */}
                    {/*
                <button
                    onClick={exportCustomColumns}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                    Export Custom (ID, Nome, Email, Turma)
                </button>
*/}
                    <button
                        onClick={refreshData}
                        className="btn btn-purple"
                    >
                        Atualizar dados
                    </button>
                </div>

                {/* Student table */}
                <h2 className="subtitle">
                    Alunos da base de dados ({students.length})
                </h2>

                <div className="table-wrapper">
                    <table className="student-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Turma</th>
                                <th>Diagnóstico</th>
                                <th>Diretor de turma</th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map((student) => (
                                <tr key={student.id}>
                                    <td>{student.id}</td>
                                    <td>{student.nome}</td>
                                    <td>{student.turma}</td>
                                    <td>{student.notas}</td>
                                    <td>{student.diretorTurma}</td>
                                    <td>
                                        <Link to={`/editar-aluno/${student.id}`} className="btn btn-view">
                                            Editar
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Instruções por fazer
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px'
            }}>
                <h3 style={{ marginTop: 0, color: '#0369a1' }}>💡 Como usar:</h3>
                <ul style={{ color: '#0c4a6e', lineHeight: '1.6' }}>
                    <li><strong>Exportar Todos os Dados:</strong> Faz o download de um ficheiro Excel com todos os dados dos alunos da base de dados</li>
                    <li><strong>Exportar Dados Personalizados:</strong> Faz o download apenas das colunas selecionadas (ID, Nome, Email, Turma, Notas)</li>
                    <li><strong>Atualizar Dados:</strong> Atualiza os dados mais recentes da base de dados</li>
                </ul>
            </div>
            */}
            </div>
        </IsLoggedIn>
    );
}