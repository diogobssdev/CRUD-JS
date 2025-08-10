let contador = 1;
let editandoIndex = null;
let cadastro = [];

function limparCampos() {
    ["nome", "idade", "sexo", "email", "estado"].forEach(id => {
        document.getElementById(id).value = "";
    });
}

function obterDados(){
    const campos = ["nome", "idade", "sexo", "email", "estado"];
    const valores = {};

    for (const campo of campos) {
        const valor = document.getElementById(campo).value.trim();
        if (!valor) return alert(`Digite o(a) ${campo}`), null;
        valores[campo] = valor;
    }

    return valores;
}

function adicionarNaTabela() {
    const dados = obterDados()
    if (!dados) return;

    if (editandoIndex!== null) {
        fetch(`/editar/${editandoIndex}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(dados)
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            carregarDadosDoBanco(); 
            limparCampos();
            document.getElementById("btnAdicionar").innerText = "Adicionar";
            editandoIndex = null;
        })
        .catch(err => {
            console.error('Erro ao editar', err);
            alert('Erro ao editar cadastro.');
        });
    } else { 
        fetch('/adicionar', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dados)
    })
    .then(response => {
        if (!response.ok) throw new Error('Erro ao salvar');
        return response.text();
    })
    .then(msg => {
        alert(msg);
        limparCampos();
        carregarDadosDoBanco(); 
    })
    .catch(err => {
        console.error(err);
        alert('Erro ao salvar no banco de dados');
    });
    }
}

function carregarDadosDoBanco() {
    fetch('/usuarios')
        .then(response => response.json())
        .then(data => {
            cadastro = data;
            atualizarTabela();
        })
        .catch(err => {
            console.error('Erro ao carregar dados', err);
        });
}

function validarInteiro(input) {
  const valor = input.value;
  if (!Number.isInteger(Number(valor))) {
    input.value = ''; // Limpa o campo ou
    alert('Por favor, insira apenas números inteiros.');
    }
    else if(valor < 0 || valor > 120){
        input.value = '';
        alert('Por favor, insira valores entre 0 e 120');
    }   
}

async function atualizarTabela() {
    const tabela = document.getElementById("tabela").getElementsByTagName("tbody")[0];
    tabela.innerHTML = "";
    contador = 1;

    cadastro.forEach((usuario) => { 
        const novaLinha = tabela.insertRow();
        const celulaNumero = novaLinha.insertCell(0);
        const celulaNome = novaLinha.insertCell(1);
        const celulaIdade = novaLinha.insertCell(2);
        const celulaSexo = novaLinha.insertCell(3);
        const celulaEmail = novaLinha.insertCell(4);
        const celulaEstado = novaLinha.insertCell(5);
        const celulaAcoes = novaLinha.insertCell(6);

        celulaNumero.innerText = contador++;
        celulaNome.innerText = usuario.nome;
        celulaIdade.innerText = usuario.idade;
        celulaSexo.innerText = usuario.sexo;
        celulaEmail.innerText = usuario.email;
        celulaEstado.innerText = usuario.estado;

        const btnEditar = document.createElement("button");
        btnEditar.innerText = "Editar";
        btnEditar.className = "btn-editar";
        btnEditar.onclick = () => editarCadastro(usuario.id);

        const btnRemover = document.createElement("button");
        btnRemover.innerText = "Remover";
        btnRemover.className = "btn-remover";
        btnRemover.onclick = () => removerCadastro(usuario.id);

        celulaAcoes.appendChild(btnEditar);
        celulaAcoes.appendChild(btnRemover);
    });
}

function removerCadastro(id) {
    if (confirm("Tem certeza que deseja remover este cadastro?")) {
        fetch(`/remover/${id}`, { 
            method: "DELETE" 
        })
        .then(res => res.json())
        .then(data => {
            alert(data.message);
            carregarDadosDoBanco(); 
        })
        .catch(err => {
            console.error('Erro ao remover', err);
            alert('Erro ao remover cadastro.');
        });
    }
}

function editarCadastro(id) {
    fetch(`/usuarios/${id}`)
    .then(res => res.json())
    .then(usuario => {
        if (!usuario) return alert("Usuário não encontrado.");

        document.getElementById("nome").value = usuario.nome;
        document.getElementById("idade").value = usuario.idade;
        document.getElementById("sexo").value = usuario.sexo;
        document.getElementById("email").value = usuario.email;
        document.getElementById("estado").value = usuario.estado;

        editandoIndex = id;

        document.getElementById("btnAdicionar").innerText = "Salvar Edição";
    })
    .catch(err => {
        console.error("Erro ao buscar usuário:", err);
        alert("Erro ao buscar dados para edição.");
    });
}

function filtrarTabela() {
    const termo = document.getElementById("busca").value.toLowerCase();
    const tabela = document.getElementById("tabela").getElementsByTagName("tbody")[0];
    tabela.innerHTML = "";
    contador = 1;

    const resultadosFiltrados = cadastro.filter(usuario => { 
        const nome = usuario.nome.toLowerCase();
        const email = usuario.email.toLowerCase();
        const estado = usuario.estado.toLowerCase();
        const sexo = usuario.sexo.toLowerCase();
        const idade = String(usuario.idade).toLowerCase(); 

        return (
            nome.includes(termo) ||
            email.includes(termo) ||
            estado.includes(termo) ||
            sexo.includes(termo) ||
            idade.includes(termo)
        );
    });

    resultadosFiltrados.forEach((usuario) => {
        const novaLinha = tabela.insertRow();
        const celulaNumero = novaLinha.insertCell(0);
        const celulaNome = novaLinha.insertCell(1);
        const celulaIdade = novaLinha.insertCell(2);
        const celulaSexo = novaLinha.insertCell(3);
        const celulaEmail = novaLinha.insertCell(4);
        const celulaEstado = novaLinha.insertCell(5);
        const celulaAcoes = novaLinha.insertCell(6);

        celulaNumero.innerText = contador++;
        celulaNome.innerText = usuario.nome;
        celulaIdade.innerText = usuario.idade;
        celulaSexo.innerText = usuario.sexo;
        celulaEmail.innerText = usuario.email;
        celulaEstado.innerText = usuario.estado;

        const btnRemover = document.createElement("button");
        btnRemover.innerText = "Remover";
        btnRemover.className = "btn-remover";
        btnRemover.onclick = () => removerCadastro(usuario.id);

        const btnEditar = document.createElement("button");
        btnEditar.innerText = "Editar";
        btnEditar.className = "btn-editar";
        btnEditar.onclick = () => editarCadastro(usuario.id);

        celulaAcoes.appendChild(btnEditar);
        celulaAcoes.appendChild(btnRemover);

    });
}

window.onload = carregarDadosDoBanco;