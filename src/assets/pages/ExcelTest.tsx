import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

interface Student {
    id: string;
    nome: string;
    email: string;
    turma: string;
    notas: string;
    professorId: string;
}

export default function ExcelTest() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Fetch alunos do backend
    useEffect(() => {
        const fetchStudents = async () => {
            try {
                setLoading(true);
                const response = await fetch('http://localhost:3000/api/alunos');
                if (!response.ok) throw new Error('Failed to fetch students');
                const data = await response.json();
                setStudents(data);
            } catch (err: any) {
                setError('Could not connect to backend. Make sure it is running on port 3000.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
    }, []);

    // Exportar todos os alunos para Excel
    const exportToExcel = () => {
        try {
            const ws = XLSX.utils.json_to_sheet(students);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Alunos');
            const date = new Date().toISOString().split('T')[0];
            const filename = `Alunos_${date}.xlsx`;
            XLSX.writeFile(wb, filename);
            setMessage(`✅ Excel file "${filename}" downloaded successfully!`);
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
            setMessage('✅ Custom Excel file downloaded!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        }
    };
*/
    // Refresh data from backend
    const refreshData = async () => {
        setError('');
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3000/api/alunos');
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
        return <div style={{ padding: '2rem', fontSize: '1.2rem', color: '#555' }}>⏳ Loading students from database...</div>;
    }

    return (
        <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#333' }}>
                Excel Export — Real DB Data
            </h1>

            {/* Error message */}
            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#fee',
                    border: '1px solid #faa',
                    borderRadius: '4px',
                    color: '#c00'
                }}>
                    {error}
                </div>
            )}

            {/* Status message */}
            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#efe',
                    border: '1px solid #afa',
                    borderRadius: '4px',
                    color: '#060'
                }}>
                    {message}
                </div>
            )}

            {/* Export buttons */}
            <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button
                    onClick={exportToExcel}
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
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
                    style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: '#8b5cf6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
                >
                    Atualizar dados
                </button>
            </div>

            {/* Student table */}
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#555' }}>
                Students from DB ({students.length})
            </h2>

            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    backgroundColor: 'white',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                    <thead>
                        <tr style={{ backgroundColor: '#f9fafb' }}>
                            <th style={headerStyle}>ID</th>
                            <th style={headerStyle}>Nome</th>
                            <th style={headerStyle}>Email</th>
                            <th style={headerStyle}>Turma</th>
                            <th style={headerStyle}>Notas</th>
                            <th style={headerStyle}>Professor ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        {students.map((student, index) => (
                            <tr
                                key={student.id}
                                style={{
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                                }}
                            >
                                <td style={cellStyle}>{student.id}</td>
                                <td style={cellStyle}>{student.nome}</td>
                                <td style={cellStyle}>{student.email}</td>
                                <td style={cellStyle}>{student.turma}</td>
                                <td style={cellStyle}>{student.notas}</td>
                                <td style={cellStyle}>{student.professorId}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Instructions */}
            <div style={{
                marginTop: '2rem',
                padding: '1rem',
                backgroundColor: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '6px'
            }}>
                <h3 style={{ marginTop: 0, color: '#0369a1' }}>💡 How to use:</h3>
                <ul style={{ color: '#0c4a6e', lineHeight: '1.6' }}>
                    <li><strong>Export All Data:</strong> Downloads an Excel file with all student data from the database</li>
                    <li><strong>Export Custom:</strong> Downloads only selected columns (ID, Nome, Email, Turma, Notas)</li>
                    <li><strong>Refresh Data:</strong> Re-fetches the latest data from the database</li>
                </ul>
            </div>
        </div>
    );
}

// Styles
const headerStyle = {
    padding: '0.75rem',
    textAlign: 'left' as const,
    borderBottom: '2px solid #e5e7eb',
    fontWeight: 'bold',
    color: '#374151'
};

const cellStyle = {
    padding: '0.75rem',
    borderBottom: '1px solid #e5e7eb',
    color: '#6b7280'
};
