import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://172.173.117.190:3001/api';

function App() {
  const [books, setBooks] = useState([]);
  const [form, setForm] = useState({ title: '', author: '' });
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [role, setRole] = useState(localStorage.getItem('role'));
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [errorLogin, setErrorLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/books`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      if (!res.ok) {
        throw new Error('Error al obtener libros');
      }
      
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error al obtener libros:', err);
      showNotification('Error al cargar los libros', 'error');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 4000);
  };

  useEffect(() => {
    if (token) {
      fetchBooks();
    }
  }, [token]);

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLoginChange = e => {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  };

  const handleLogin = async e => {
    e.preventDefault();
    setErrorLogin('');
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      
      if (!res.ok) {
        throw new Error('Credenciales incorrectas');
      }
      
      const data = await res.json();
      setToken(data.token);
      setRole(data.role);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      setLoginForm({ username: '', password: '' });
      showNotification(`Bienvenido! Sesión iniciada como ${data.role}`, 'success');
    } catch (err) {
      setErrorLogin('Usuario o contraseña incorrectos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setRole(null);
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setBooks([]);
    showNotification('Sesión cerrada correctamente', 'success');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!token || role !== 'admin') {
      showNotification('No tienes permiso para realizar esta acción', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const url = editingId === null ? `${API_URL}/books` : `${API_URL}/books/${editingId}`;
      const method = editingId === null ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error('Error al guardar el libro');
      }

      setForm({ title: '', author: '' });
      setEditingId(null);
      fetchBooks();
      showNotification(
        editingId === null ? 'Libro agregado exitosamente' : 'Libro actualizado exitosamente',
        'success'
      );
    } catch (err) {
      showNotification('Error al guardar el libro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = book => {
    if (role !== 'admin') {
      showNotification('No tienes permiso para editar', 'error');
      return;
    }
    setEditingId(book.id);
    setForm({ title: book.title, author: book.author });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({ title: '', author: '' });
  };

  const handleDelete = async id => {
    if (!token || role !== 'admin') {
      showNotification('No tienes permiso para eliminar', 'error');
      return;
    }
    
    if (window.confirm('¿Estás seguro de que deseas eliminar este libro?')) {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/books/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
          throw new Error('Error al eliminar el libro');
        }

        fetchBooks();
        showNotification('Libro eliminado exitosamente', 'success');
      } catch (err) {
        showNotification('Error al eliminar el libro', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredBooks = Array.isArray(books)
    ? books.filter(book =>
        book.title.toLowerCase().includes(search.toLowerCase()) ||
        book.author.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (!token) {
    return (
      <div className="login-container">
        <h2 className="login-title">📚 Biblioteca Nube</h2>
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="👤 Usuario"
              value={loginForm.username}
              onChange={handleLoginChange}
              required
              disabled={loading}
            />
          </div>
          <div className="mb-3">
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="🔒 Contraseña"
              value={loginForm.password}
              onChange={handleLoginChange}
              required
              disabled={loading}
            />
          </div>
          {errorLogin && <div className="alert alert-danger">{errorLogin}</div>}
          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
          <div className="mt-4 text-center" style={{ fontSize: '0.9rem', color: '#666' }}>
            <strong>Usuarios de prueba:</strong><br />
            Admin: admin / admin123<br />
            Usuario: user / user123
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      {notification.show && (
        <div className={`alert ${notification.type === 'error' ? 'alert-danger' : 'alert-success'} position-fixed`} 
             style={{ top: '20px', right: '20px', zIndex: 1050, minWidth: '300px' }}>
          {notification.message}
        </div>
      )}

      <h1 className="main-title">📚 Biblioteca Nube</h1>
      
      <div className="user-info">
        <h5>
          Bienvenido: <span className={role === 'admin' ? 'admin-badge' : 'user-badge'}>{role}</span>
        </h5>
        <button className="btn btn-logout" onClick={handleLogout}>
          🚪 Cerrar Sesión
        </button>
      </div>

      {role === 'admin' && (
        <div className="card mb-4" style={{ borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
          <div className="card-header" style={{ background: 'linear-gradient(135deg, #4299e1, #667eea)', color: 'white', borderRadius: '15px 15px 0 0' }}>
            <h5 className="mb-0">
              {editingId === null ? '➕ Agregar Nuevo Libro' : '✏️ Editar Libro'}
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-5">
                <input
                  type="text"
                  name="title"
                  className="form-control"
                  placeholder="📖 Título del libro"
                  value={form.title}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="col-md-5">
                <input
                  type="text"
                  name="author"
                  className="form-control"
                  placeholder="✍️ Autor del libro"
                  value={form.author}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="col-md-2 d-grid">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? '⏳' : (editingId === null ? '➕ Agregar' : '💾 Actualizar')}
                </button>
              </div>
              {editingId !== null && (
                <div className="col-12">
                  <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                    ❌ Cancelar Edición
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      <div className="mb-3">
        <input
          type="text"
          placeholder="🔍 Buscar por título o autor..."
          className="search-box form-control"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="books-count">
        📊 Total de libros: {filteredBooks.length} 
        {search && ` (filtrados de ${books.length})`}
      </div>

      {loading && !books.length ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-2">Cargando libros...</p>
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="no-books">
          {search ? '🔍 No se encontraron libros que coincidan con tu búsqueda' : '📚 No hay libros en la biblioteca'}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>📖 Título</th>
                <th>✍️ Autor</th>
                <th>📅 Fecha</th>
                {role === 'admin' && <th>⚙️ Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map(book => (
                <tr key={book.id}>
                  <td style={{ fontWeight: '600' }}>{book.title}</td>
                  <td>{book.author}</td>
                  <td style={{ fontSize: '0.9rem', color: '#666' }}>
                    {book.created_at ? new Date(book.created_at).toLocaleDateString('es-ES') : 'N/A'}
                  </td>
                  {role === 'admin' && (
                    <td>
                      <button 
                        className="btn btn-warning btn-sm me-2" 
                        onClick={() => handleEdit(book)}
                        disabled={loading}
                      >
                        ✏️ Editar
                      </button>
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => handleDelete(book.id)}
                        disabled={loading}
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;

