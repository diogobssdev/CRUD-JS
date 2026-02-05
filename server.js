const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function normalizarValor(valorTexto) {
    if (!valorTexto) return null;
    const limpo = valorTexto
        .replace(/[^\d,.-]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    const valor = Number(limpo);
    return Number.isFinite(valor) ? valor : null;
}

function detectarCategoria(texto) {
    const categorias = [
        { nome: 'Mercado', palavras: ['mercado', 'supermercado', 'padaria', 'hortifruti'] },
        { nome: 'Transporte', palavras: ['uber', '99', 'gasolina', 'combustível', 'ônibus', 'metro'] },
        { nome: 'Moradia', palavras: ['aluguel', 'condomínio', 'luz', 'energia', 'água', 'internet'] },
        { nome: 'Lazer', palavras: ['cinema', 'show', 'viagem', 'restaurante', 'bar'] },
        { nome: 'Saúde', palavras: ['farmácia', 'remédio', 'médico', 'consulta'] },
    ];

    const textoLower = texto.toLowerCase();
    const encontrada = categorias.find((categoria) =>
        categoria.palavras.some((palavra) => textoLower.includes(palavra)),
    );
    return encontrada ? encontrada.nome : 'Outros';
}

function detectarPagamento(texto) {
    const textoLower = texto.toLowerCase();
    if (textoLower.includes('pix')) return 'Pix';
    if (textoLower.includes('débito') || textoLower.includes('debito')) return 'Débito';
    if (textoLower.includes('crédito') || textoLower.includes('credito')) return 'Crédito';
    if (textoLower.includes('dinheiro')) return 'Dinheiro';
    return 'Indefinido';
}

function extrairData(texto) {
    const matchNumerico = texto.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (matchNumerico) {
        const dia = matchNumerico[1].padStart(2, '0');
        const mes = matchNumerico[2].padStart(2, '0');
        const ano = matchNumerico[3]
            ? matchNumerico[3].length === 2
                ? `20${matchNumerico[3]}`
                : matchNumerico[3]
            : new Date().getFullYear().toString();
        return `${ano}-${mes}-${dia}`;
    }

    return new Date().toISOString().slice(0, 10);
}

function extrairValor(texto) {
    const valorComMoeda = texto.match(/r\$\s*\d+[.,]?\d{0,2}/i);
    if (valorComMoeda) return normalizarValor(valorComMoeda[0]);

    const valorDecimal = texto.match(/\d+[.,]\d{2}/);
    if (valorDecimal) return normalizarValor(valorDecimal[0]);

    const valorInteiro = texto.match(/\b\d+\b/);
    return valorInteiro ? normalizarValor(valorInteiro[0]) : null;
}

function extrairDescricao(texto) {
    return texto
        .replace(/\b(comprei|paguei|gastei|em|no|na|dia|por)\b/gi, '')
        .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '')
        .replace(/r\$\s*\d+[.,]?\d{0,2}/gi, '')
        .replace(/\d+[.,]\d{2}/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

function parseMensagem(texto) {
    const data_compra = extrairData(texto);
    const valor = extrairValor(texto);
    const categoria = detectarCategoria(texto);
    const forma_pagamento = detectarPagamento(texto);
    const descricao = extrairDescricao(texto) || 'Compra sem descrição';

    return {
        descricao,
        data_compra,
        valor,
        categoria,
        forma_pagamento,
    };
}

async function start() {
    const db = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'cadastro_usuarios',
    });

    console.log('Conectado ao banco de dados');

    app.post('/mensagem', async (req, res) => {
        const { texto } = req.body;
        if (!texto || typeof texto !== 'string') {
            return res.status(400).json({ message: 'Texto inválido.' });
        }

        const dados = parseMensagem(texto);
        if (dados.valor === null) {
            return res.status(422).json({ message: 'Não foi possível identificar o valor da compra.' });
        }

        const sql =
            'INSERT INTO gastos (descricao, data_compra, valor, categoria, forma_pagamento, origem, mensagem_original) VALUES (?, ?, ?, ?, ?, ?, ?)';
        try {
            await db.query(sql, [
                dados.descricao,
                dados.data_compra,
                dados.valor,
                dados.categoria,
                dados.forma_pagamento,
                'WhatsApp',
                texto,
            ]);
            res.json({
                message: 'Mensagem processada e salva com sucesso!',
                dados: { ...dados, valor_formatado: currencyFormatter.format(dados.valor) },
            });
        } catch (err) {
            console.error('Erro ao inserir', err);
            res.status(500).send('Erro ao salvar no banco');
        }
    });

    app.post('/gastos', async (req, res) => {
        const { descricao, data_compra, valor, categoria, forma_pagamento } = req.body;
        const sql =
            'INSERT INTO gastos (descricao, data_compra, valor, categoria, forma_pagamento, origem) VALUES (?, ?, ?, ?, ?, ?)';

        try {
            await db.query(sql, [descricao, data_compra, valor, categoria, forma_pagamento, 'Manual']);
            res.send('Gasto salvo com sucesso!');
        } catch (err) {
            console.error('Erro ao inserir', err);
            res.status(500).send('Erro ao salvar no banco');
        }
    });

    app.get('/gastos', async (req, res) => {
        try {
            const [rows] = await db.query('SELECT * FROM gastos ORDER BY data_compra DESC, id DESC');
            res.json(rows);
        } catch (err) {
            console.error('Erro ao buscar dados', err);
            res.status(500).send('Erro ao carregar gastos.');
        }
    });

    app.get('/gastos/:id', async (req, res) => {
        const id = req.params.id;

        try {
            const [rows] = await db.query('SELECT * FROM gastos WHERE id = ?', [id]);

            if (rows.length === 0) {
                return res.status(404).json({ message: 'Gasto não encontrado' });
            }

            res.json(rows[0]);
        } catch (err) {
            console.error('Erro ao buscar gasto:', err);
            res.status(500).json({ message: 'Erro ao buscar gasto' });
        }
    });

    app.put('/gastos/:id', async (req, res) => {
        const id = req.params.id;
        const { descricao, data_compra, valor, categoria, forma_pagamento } = req.body;

        try {
            await db.query(
                'UPDATE gastos SET descricao = ?, data_compra = ?, valor = ?, categoria = ?, forma_pagamento = ? WHERE id = ?',
                [descricao, data_compra, valor, categoria, forma_pagamento, id],
            );
            res.json({ message: 'Gasto atualizado com sucesso!' });
        } catch (err) {
            console.error('Erro ao atualizar:', err);
            res.status(500).json({ message: 'Erro ao atualizar' });
        }
    });

    app.delete('/gastos/:id', async (req, res) => {
        const id = req.params.id;

        try {
            await db.query('DELETE FROM gastos WHERE id = ?', [id]);
            res.json({ message: 'Gasto removido com sucesso' });
        } catch (error) {
            console.error('Erro ao remover:', error);
            res.status(500).json({ error: 'Erro ao remover do banco de dados' });
        }
    });

    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

start();
