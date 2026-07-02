const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = 8080;
const DB_PATH = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ users: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}
function writeDB(data) { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)); }
function hashPassword(p) { return crypto.createHash('sha256').update(p + 'signtranslate_salt').digest('hex'); }
function generateToken(id) { return crypto.randomBytes(32).toString('hex') + '.' + id; }
function verifyToken(t) { if (!t) return null; const p = t.split('.'); return p.length === 2 ? p[1] : null; }

function requireAuth(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  const userId = verifyToken(token);
  if (!userId) return res.status(401).json({ error: 'Token inválido' });
  const user = readDB().users.find(u => u.id === userId);
  if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
  req.user = user;
  next();
}

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ error: 'Correo electrónico inválido' });
  const db = readDB();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase()))
    return res.status(409).json({ error: 'Este correo ya está registrado' });
  const newUser = { id: crypto.randomUUID(), name: name.trim(), email: email.toLowerCase().trim(), password: hashPassword(password), createdAt: new Date().toISOString() };
  db.users.push(newUser);
  writeDB(db);
  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ message: 'Usuario registrado exitosamente', token: generateToken(newUser.id), user: safeUser });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Correo y contraseña son obligatorios' });
  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== hashPassword(password))
    return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
  const { password: _, ...safeUser } = user;
  res.json({ message: 'Sesión iniciada exitosamente', token: generateToken(user.id), user: safeUser });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const { password: _, ...safeUser } = req.user;
  res.json({ user: safeUser });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n✅ Servidor iniciado en 0.0.0.0:${PORT}`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`🔗 Red:   http://10.179.77.39:${PORT}\n`);
});
