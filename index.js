const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Lista de origens permitidas
const whitelist = ['http://localhost:3000', 'https://backend-avalie.onrender.com', 'https://avalieimoveis.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const pool = new Pool({
  connectionString: 'postgresql://avalie_imoveis_owner:rqBTYR6N5bks@ep-dawn-forest-a5321xho.us-east-2.aws.neon.tech/avalie_imoveis?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
  },
});

// Função para gerar hash da senha
async function hashPassword(password) {
  const saltRounds = 10;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

// Rota de login
app.post('/login', async (req, res) => {
  const { usuario, senha } = req.body;

  try {
    // Buscar o usuário pelo email no banco de dados
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [usuario]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ success: false, message: "Usuário não encontrado" });
    }

    // Comparar a senha fornecida com a senha encriptada armazenada no banco de dados
    const match = await bcrypt.compare(senha, user.senha);
    console.log(`Comparing passwords: ${senha} vs ${user.senha}`);
    console.log(`Match: ${match}`);

    if (match) {
      // Senhas correspondem
      const token = jwt.sign({ id: user.id, role: user.role }, 'your-secret-key', { expiresIn: '1h' });
      return res.json({ success: true, token, role: user.role });
    } else {
      // Senhas não correspondem
      return res.status(401).json({ success: false, message: "Senha incorreta" });
    }
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({ success: false, message: "Erro interno do servidor" });
  }
});

// Rota para buscar a empresa do usuário
app.get('/empresa', async (req, res) => {
  const { usuario } = req.query;

  if (!usuario) {
    return res.status(400).json({ success: false, message: "Nome de usuário é necessário" });
  }

  try {
    const result = await pool.query('SELECT empresa FROM users WHERE email = $1', [usuario]);
    const user = result.rows[0];

    if (user && user.empresa) {
      return res.json({ success: true, empresa: user.empresa });
    } else {
      return res.status(404).json({ success: false, message: "Usuário não encontrado" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: "Erro ao buscar a empresa do usuário", error: error.message });
  }
});

// Nova rota de registro
app.post('/register', async (req, res) => {
  const { email, senha, empresa } = req.body;

  try {
    // Gerar hash da senha
    const hashedPassword = await hashPassword(senha);

    // Inserir novo usuário no banco de dados
    const result = await pool.query(
      'INSERT INTO users (email, senha, empresa, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, hashedPassword, empresa, 'admin'] // 'user' é a role padrão, ajuste se necessário
    );

    const newUser = result.rows[0];
    res.json({ success: true, user: newUser });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res.status(500).json({ success: false, message: "Erro ao registrar usuário" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});