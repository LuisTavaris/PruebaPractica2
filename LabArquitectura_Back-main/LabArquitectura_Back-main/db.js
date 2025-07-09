const { Pool } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
  // Primero conectar sin especificar la base de datos para crearla
  const adminPool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Crear la base de datos si no existe
    await adminPool.query(`CREATE DATABASE ${process.env.DB_DATABASE}`);
    console.log(`Base de datos '${process.env.DB_DATABASE}' creada exitosamente`);
  } catch (error) {
    if (error.code === '42P04') {
      console.log(`Base de datos '${process.env.DB_DATABASE}' ya existe`);
    } else {
      console.error('Error creando la base de datos:', error.message);
    }
  } finally {
    await adminPool.end();
  }

  // Ahora conectar a la base de datos específica
  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Crear tabla users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user'
      )
    `);

    // Crear tabla books
    await pool.query(`
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        author VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Tablas creadas exitosamente');

    // Verificar si existen usuarios, si no crear usuario admin por defecto
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO users (username, password, role) VALUES 
        ('admin', 'admin123', 'admin'),
        ('user', 'user123', 'user')
      `);
      console.log('Usuarios por defecto creados');
    }

    // Verificar si existen libros, si no crear algunos de ejemplo
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    if (parseInt(bookCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO books (title, author) VALUES 
        ('Cien años de soledad', 'Gabriel García Márquez'),
        ('Don Quijote de la Mancha', 'Miguel de Cervantes'),
        ('El Principito', 'Antoine de Saint-Exupéry')
      `);
      console.log('Libros de ejemplo creados');
    }

  } catch (error) {
    console.error('Error inicializando tablas:', error.message);
  }

  return pool;
}

module.exports = { initializeDatabase };