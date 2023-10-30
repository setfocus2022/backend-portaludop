const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
    connectionString: 'postgres://conectfam:NAZVSTm5pac8@ep-delicate-poetry-48710359.us-east-2.aws.neon.tech/portalUDOP'
});

app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

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
});


const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
