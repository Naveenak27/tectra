const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./db');
const { doctorCreateSchema, doctorUpdateSchema, listQuerySchema } = require('./validate');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/api/doctors', async (req, res) => {
  try {
    const { page, pageSize, q, specialty, sortBy = 'created_at', sortDir = 'desc' } =
      listQuerySchema.parse(req.query);

    const where = [];
    const params = {};
    if (q) {
      where.push('(name LIKE :q OR email LIKE :q)');
      params.q = `%${q}%`;
    }
    if (specialty) {
      where.push('specialty = :specialty');
      params.specialty = specialty;
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) as total FROM doctors ${whereSql}`,
      params
    );

    const offset = (page - 1) * pageSize;
    const [rows] = await pool.query(
      `SELECT id, name, specialty, email, phone, is_active, created_at, updated_at
       FROM doctors
       ${whereSql}
       ORDER BY ${['name','specialty','created_at','updated_at'].includes(sortBy) ? sortBy : 'created_at'} ${sortDir === 'asc' ? 'ASC' : 'DESC'}
       LIMIT :limit OFFSET :offset`,
      { ...params, limit: pageSize, offset }
    );

    res.json({ data: rows, pagination: { page, pageSize, total } });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, specialty, email, phone, is_active, created_at, updated_at FROM doctors WHERE id = :id',
      { id: req.params.id }
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/doctors', async (req, res) => {
  try {
    const body = doctorCreateSchema.parse(req.body);
    const [result] = await pool.query(
      `INSERT INTO doctors (name, specialty, email, phone, is_active)
       VALUES (:name, :specialty, :email, :phone, :is_active)`,
      { ...body, is_active: body.is_active ?? true }
    );
    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = :id', { id: result.insertId });
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/doctors/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const update = doctorUpdateSchema.parse(req.body);
    if (!Object.keys(update).length) return res.status(400).json({ error: 'No fields to update' });

    const sets = [];
    const params = { id };
    for (const [k, v] of Object.entries(update)) {
      sets.push(`${k} = :${k}`);
      params[k] = v;
    }
    const sql = `UPDATE doctors SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = :id`;
    const [result] = await pool.query(sql, params);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });

    const [rows] = await pool.query('SELECT * FROM doctors WHERE id = :id', { id });
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Email already exists' });
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/doctors/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM doctors WHERE id = :id', { id: req.params.id });
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API running on http://localhost:${port}`);
});
