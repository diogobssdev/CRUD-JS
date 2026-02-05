let gastos = [];
let editandoId = null;

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
});

function limparCampos() {
    ['descricao', 'data_compra', 'valor'].forEach((id) => {
        const input = document.getElementById(id);
        input.value = '';
    });
    document.getElementById('categoria').value = 'Mercado';
    document.getElementById('forma_pagamento').value = 'Pix';
}

function obterDados() {
    const descricao = document.getElementById('descricao').value.trim();
    const data_compra = document.getElementById('data_compra').value;
    const valor = document.getElementById('valor').value;
    const categoria = document.getElementById('categoria').value;
    const forma_pagamento = document.getElementById('forma_pagamento').value;

    if (!descricao) return alert('Digite a descrição.'), null;
    if (!data_compra) return alert('Informe a data da compra.'), null;
    if (!valor) return alert('Informe o valor.'), null;

    return { descricao, data_compra, valor, categoria, forma_pagamento };
}

function processarMensagem() {
    const texto = document.getElementById('mensagem').value.trim();
    const status = document.getElementById('mensagemStatus');
    status.textContent = '';

    if (!texto) {
        status.textContent = 'Digite a mensagem antes de processar.';
        status.className = 'status error';
        return;
    }

    fetch('/mensagem', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ texto }),
    })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((data) => {
                    throw new Error(data.message || 'Erro ao processar mensagem.');
                });
            }
            return response.json();
        })
        .then((data) => {
            status.textContent = data.message;
            status.className = 'status success';
            document.getElementById('mensagem').value = '';
            carregarGastos();
        })
        .catch((err) => {
            status.textContent = err.message;
            status.className = 'status error';
        });
}

function adicionarGasto() {
    const dados = obterDados();
    if (!dados) return;

    const url = editandoId ? `/gastos/${editandoId}` : '/gastos';
    const method = editandoId ? 'PUT' : 'POST';

    fetch(url, {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dados),
    })
        .then((response) => {
            if (!response.ok) throw new Error('Erro ao salvar');
            const contentType = response.headers.get('content-type') || '';
            return contentType.includes('application/json') ? response.json() : response.text();
        })
        .then(() => {
            alert(editandoId ? 'Gasto atualizado!' : 'Gasto salvo!');
            limparCampos();
            editandoId = null;
            document.getElementById('btnAdicionar').innerText = 'Adicionar gasto';
            carregarGastos();
        })
        .catch((err) => {
            console.error(err);
            alert('Erro ao salvar no banco de dados');
        });
}

function carregarGastos() {
    fetch('/gastos')
        .then((response) => response.json())
        .then((data) => {
            gastos = data;
            atualizarTabela();
            atualizarDashboard();
        })
        .catch((err) => {
            console.error('Erro ao carregar dados', err);
        });
}

function atualizarTabela(lista = gastos) {
    const tabela = document.getElementById('tabela').getElementsByTagName('tbody')[0];
    tabela.innerHTML = '';

    lista.forEach((gasto) => {
        const novaLinha = tabela.insertRow();
        const celulaId = novaLinha.insertCell(0);
        const celulaDescricao = novaLinha.insertCell(1);
        const celulaData = novaLinha.insertCell(2);
        const celulaValor = novaLinha.insertCell(3);
        const celulaCategoria = novaLinha.insertCell(4);
        const celulaPagamento = novaLinha.insertCell(5);
        const celulaOrigem = novaLinha.insertCell(6);
        const celulaAcoes = novaLinha.insertCell(7);

        celulaId.innerText = gasto.id;
        celulaDescricao.innerText = gasto.descricao;
        celulaData.innerText = new Date(gasto.data_compra).toLocaleDateString('pt-BR');
        celulaValor.innerText = currencyFormatter.format(gasto.valor);
        celulaCategoria.innerText = gasto.categoria;
        celulaPagamento.innerText = gasto.forma_pagamento;
        celulaOrigem.innerText = gasto.origem || 'Manual';

        const btnEditar = document.createElement('button');
        btnEditar.innerText = 'Editar';
        btnEditar.className = 'btn-editar';
        btnEditar.onclick = () => editarGasto(gasto.id);

        const btnRemover = document.createElement('button');
        btnRemover.innerText = 'Remover';
        btnRemover.className = 'btn-remover';
        btnRemover.onclick = () => removerGasto(gasto.id);

        celulaAcoes.appendChild(btnEditar);
        celulaAcoes.appendChild(btnRemover);
    });
}

function removerGasto(id) {
    if (confirm('Tem certeza que deseja remover este gasto?')) {
        fetch(`/gastos/${id}`, {
            method: 'DELETE',
        })
            .then((res) => res.json())
            .then((data) => {
                alert(data.message);
                carregarGastos();
            })
            .catch((err) => {
                console.error('Erro ao remover', err);
                alert('Erro ao remover gasto.');
            });
    }
}

function editarGasto(id) {
    fetch(`/gastos/${id}`)
        .then((res) => res.json())
        .then((gasto) => {
            if (!gasto) return alert('Gasto não encontrado.');

            document.getElementById('descricao').value = gasto.descricao;
            document.getElementById('data_compra').value = gasto.data_compra.slice(0, 10);
            document.getElementById('valor').value = gasto.valor;
            document.getElementById('categoria').value = gasto.categoria;
            document.getElementById('forma_pagamento').value = gasto.forma_pagamento;

            editandoId = id;
            document.getElementById('btnAdicionar').innerText = 'Salvar edição';
        })
        .catch((err) => {
            console.error('Erro ao buscar gasto:', err);
            alert('Erro ao buscar dados para edição.');
        });
}

function filtrarTabela() {
    const termo = document.getElementById('busca').value.toLowerCase();
    if (!termo) {
        atualizarTabela();
        return;
    }

    const resultados = gastos.filter((gasto) => {
        return (
            gasto.descricao.toLowerCase().includes(termo) ||
            gasto.categoria.toLowerCase().includes(termo) ||
            gasto.forma_pagamento.toLowerCase().includes(termo) ||
            String(gasto.valor).includes(termo)
        );
    });

    atualizarTabela(resultados);
}

function atualizarDashboard() {
    const total = gastos.reduce((acc, gasto) => acc + Number(gasto.valor), 0);
    document.getElementById('totalGasto').innerText = currencyFormatter.format(total);

    const agora = new Date();
    const mesAtual = agora.getMonth();
    const anoAtual = agora.getFullYear();

    const totalMes = gastos.reduce((acc, gasto) => {
        const data = new Date(gasto.data_compra);
        if (data.getMonth() === mesAtual && data.getFullYear() === anoAtual) {
            return acc + Number(gasto.valor);
        }
        return acc;
    }, 0);

    document.getElementById('totalMes').innerText = currencyFormatter.format(totalMes);

    const resumoCategorias = gastos.reduce((acc, gasto) => {
        acc[gasto.categoria] = (acc[gasto.categoria] || 0) + Number(gasto.valor);
        return acc;
    }, {});

    const lista = document.getElementById('categoriasResumo');
    lista.innerHTML = '';
    Object.entries(resumoCategorias)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .forEach(([categoria, valor]) => {
            const item = document.createElement('li');
            item.innerText = `${categoria}: ${currencyFormatter.format(valor)}`;
            lista.appendChild(item);
        });
}

window.onload = carregarGastos;
