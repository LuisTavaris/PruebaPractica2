const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener todos los libros
router.get('/', async (req, res) => {
  const result = await pool.query('SELECT * FROM books');
  res.json(result.rows);
});

// Crear un nuevo libro
router.post('/', async (req, res) => {
  const { title, author } = req.body;
  const result = await pool.query(
    'INSERT INTO books (title, author) VALUES ($1, $2) RETURNING *',
    [title, author]
  );
  res.json(result.rows[0]);
});

// Eliminar un libro por ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM books WHERE id = $1', [id]);
  res.json({ message: 'Libro eliminado' });
});

module.exports = router;