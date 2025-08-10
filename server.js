const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const mysql = require('mysql2/promise');

async function start(){
const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'cadastro_usuarios',
});

console.log("Conectado ao banco de dados");

app.post('/adicionar', async (req, res) => {
    const { nome, idade, sexo, email, estado} = req.body;
    const sql = 'INSERT INTO usuarios (nome, idade, sexo, email, estado) VALUES (?, ?, ?, ?, ?)';
    
    try {
     await db.query(sql, [nome, idade, sexo, email, estado]);
        res.send('Cadastro salvo com sucesso!')
       } catch (err) {
            console.error('Erro ao inserir', err);
            res.status(500).send('Erro ao salvar no banco');
        }
});

app.get('/usuarios', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM usuarios');
        res.json(rows);
    } catch (err) {
        console.error('Erro ao buscar dados', err);
        res.status(500).send('Erro ao carregar usuarios.');
    }
});

app.get('/usuarios/:id', async (req, res) => {
    const id = req.params.id;

    try {
        const [rows] = await db.query("SELECT * FROM usuarios WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Usuário não encontrado" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("Erro ao buscar usuário:", err);
        res.status(500).json({ message: "Erro ao buscar usuário" });
    }
});


app.put('/editar/:id', async (req, res) => {
    const id = req.params.id;
    const { nome, idade, sexo, email, estado} = req.body;

    try {
     await db.query(
        "UPDATE usuarios SET nome = ?, idade = ?, sexo = ?, email = ?, estado = ? WHERE id = ?",
        [nome, idade, sexo, email, estado, id]
    );
    res.json({ message: "Cadastro atualizado com sucesso!" });
     } catch (err) {
        console.error("Erro ao atualizar:", err);
        res.status(500).json({  message: "Erro ao atualizar" });
     }
});

app.delete('/remover/:id', async (req, res) => {
    const id = req.params.id;

    try {
        await db.query("DELETE FROM usuarios WHERE id = ?", [id]);
        res.json({ message: "Usuário removido com sucesso"});
    } catch (error) {
        console.error("Erro ao remover:", error);
        res.status(500).json({ error: "Erro ao remover do banco de dados" });
    }
    });

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
}

start();
