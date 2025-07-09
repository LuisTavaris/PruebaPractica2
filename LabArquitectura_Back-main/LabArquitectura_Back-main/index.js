require('dotenv').config();

// const fs = require('fs');
// const https = require('https');

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { initializeDatabase } = require('./db');

const app = express();
const port = 3001;
const SECRET = process.env.JWT_SECRET || 'espe123';

// Middleware
app.use(cors());
app.use(express.json());

let pool;

// Ruta login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username=$1 AND password=$2', [username, password]);
    if (result.rows.length === 0) return res.status(401).json({ message: 'Credenciales inválidas' });

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, SECRET, { expiresIn: '2h' });

    res.json({ token, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error en el servidor');
  }
});

// Middleware para validar token y extraer usuario
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token requerido' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
}

// Middleware para permitir solo admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado: solo admin' });
  }
  next();
}

// Ahora protege las rutas que requieren login y/o admin
// Por ejemplo, para crear, actualizar y borrar libros solo admin:

app.get('/api/books', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM books ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar los libros');
  }
});

app.post('/api/books', authenticateToken, requireAdmin, async (req, res) => {
  const { title, author } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO books (title, author) VALUES ($1, $2) RETURNING *',
      [title, author]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al crear el libro');
  }
});

app.put('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const { title, author } = req.body;
  try {
    const result = await pool.query(
      'UPDATE books SET title=$1, author=$2 WHERE id=$3 RETURNING *',
      [title, author, id]
    );
    if (result.rows.length === 0) return res.status(404).send('Libro no encontrado');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el libro');
  }
});

app.delete('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const result = await pool.query('DELETE FROM books WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).send('Libro no encontrado');
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al borrar el libro');
  }
});

async function startServer() {
  try {
    console.log('Inicializando base de datos...');
    pool = await initializeDatabase();
    console.log('Base de datos inicializada correctamente');
    
    app.listen(port, '0.0.0.0', () => {
      console.log(`Servidor backend corriendo en el puerto ${port}`);
      console.log('¡Aplicación lista para usar!');
      console.log('Usuarios por defecto:');
      console.log('  Admin: username="admin", password="admin123"');
      console.log('  User: username="user", password="user123"');
    });
    
  } catch (error) {
    console.error('Error iniciando el servidor:', error);
    process.exit(1);
  }
}

startServer();

// const sslOptions = {
//   key: fs.readFileSync('./ssl/server.key'),
//   cert: fs.readFileSync('./ssl/server.cert')
// };

// https.createServer(sslOptions, app).listen(port, '0.0.0.0', () => {
//   console.log(`Servidor backend corriendo en HTTPS puerto ${port}`);
// });
