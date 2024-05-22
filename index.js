const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();

// Lista de origens permitidas (adicionar todas as origens necessárias)
const whitelist = ['http://localhost:3000', 'https://backend-avalie.onrender.com', 'https://avalieimoveis.vercel.app'];

const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // Permitir cookies CORS
};

// Habilitar CORS com as opções especificadas
app.use(cors(corsOptions));

app.use(express.json());

const pool = new Pool({
  connectionString: 'postgresql://avalie_imoveis_owner:rqBTYR6N5bks@ep-dawn-forest-a5321xho.us-east-2.aws.neon.tech/avalie_imoveis?sslmode=require',
  ssl: {
    rejectUnauthorized: false,
  },
});

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

const PORT = process.env.PORT || 3001; // Usar a porta definida pelo Render ou 3001
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

async function hashPassword(password) {
  const saltRounds = 10; 
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

(async () => {
  const senha = '@Admin';
  const senhaEncriptada = await hashPassword(senha);
  console.log(senhaEncriptada); 
})();