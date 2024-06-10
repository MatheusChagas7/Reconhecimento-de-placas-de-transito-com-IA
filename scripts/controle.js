let model, webcam, labelContainer, maxPrevisao;
let veiculoLigado = false;
let velocidadeAtual = 0;
let ultimoTempoDePrevisao = 0;
let chart;
let velocidadeMaximaLida = 0;
let timeoutAudio;

async function iniciar() {
    const URL = "../modelo/";
    const modeloURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    model = await tmImage.load(modeloURL, metadataURL);
    maxPrevisao = model.getTotalClasses();

    const flip = false;
    webcam = new tmImage.Webcam(200, 200, flip);

    try {
        await webcam.setup();
        await webcam.play();
        window.requestAnimationFrame(loop);

        const videoContainer = document.getElementById("video");
        videoContainer.innerHTML = '';
        videoContainer.appendChild(webcam.canvas);
        videoContainer.style.display = 'block';
    } catch (error) {
        console.error("Erro ao acessar a webcam:", error);
        document.getElementById("video").innerHTML = '<p>Webcam não disponível</p>';
    }

    mensagem("Veículo desligado!")

    labelContainer = document.getElementById("label-container");

    // início gráfico de probabilidade
    const ctx = document.getElementById('prediction-chart').getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Probabilidade',
                data: [],
                backgroundColor: 'rgba(0, 123, 255, 0.5)',
                borderColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 1,
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 1,
                    ticks: {
                        color: 'white' // Cor do texto dos valores do eixo Y
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                },
                x: {
                    ticks: {
                        color: 'white' // Cor do texto dos valores do eixo X
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.3)'
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: 'white' // Cor do texto da legenda
                    }
                }
            }
        }
    });

    const labels = await model.getClassLabels();
    chart.data.labels = labels;
    chart.update();
    // Fim gráfico de probabilidade

    atualizarVisibilidadeVideo(); // Atualiza a visibilidade inicial do vídeo
}

async function loop(timestamp) {
    if (veiculoLigado || timestamp - ultimoTempoDePrevisao > 1000) {
        ultimoTempoDePrevisao = timestamp;
        if (webcam.canvas) {
            webcam.update();
            await prever();
        }
    }
    window.requestAnimationFrame(loop);
}

async function prever() {
    if (veiculoLigado && webcam.canvas) {
        const prediction = await model.predict(webcam.canvas);
        const data = prediction.map(p => p.probability.toFixed(2));
        chart.data.datasets[0].data = data;
        chart.update();

        atualizarVelocidadeMax(prediction); // Atualiza a velocidade máxima lida
    }
}

// Função para atribuir a velocidade máxima lida na placa ao painel velocidadeMaxima.
// A velocidade atribuida é a que tiver com a maior probabilidade.
function atualizarVelocidadeMax(prediction) {
    let maxIndex = 0;
    let probabilidadeMax = 0;

    for (let i = 0; i < prediction.length; i++) {
        if (prediction[i].probability > probabilidadeMax) {
            probabilidadeMax = prediction[i].probability;
            maxIndex = i;
        }
    }

    const maxSpeedLabel = prediction[maxIndex].className; // Supondo que o label da classe seja a velocidade
    velocidadeMaximaLida = parseInt(maxSpeedLabel, 10); // Atualiza a velocidade máxima lida como um número
    document.getElementById("velocidadeMaxima").textContent = `Velocidade máxima lida: ${velocidadeMaximaLida} km/h`;

    verificarVelocidade(); // Verifica se a velocidade atual ultrapassou a velocidade máxima
}

// Função para verificar se a velocidade atual do veículo é maior que a velocidade máxima lida na placa
function verificarVelocidade() {
    if (velocidadeAtual > velocidadeMaximaLida) {
        tocarAudioAlerta();
    }
}

// Função para tocar o áudio de alerta
function tocarAudioAlerta() {
    if (!timeoutAudio) { // Só toca o áudio se não houver timeout agendado
        const audio = new Audio('../assets/audio/Limite_de_velocidade.mp3');
        audio.play();
        mensagem("Limite de velocidade excedido, por favor reduza a velocidade!");

        // Agenda o próximo alerta para daqui a 10 segundos
        timeoutAudio = setTimeout(() => {
            timeoutAudio = null; // Libera o timeout para permitir nova verificação
            if (velocidadeAtual > velocidadeMaximaLida) {
                tocarAudioAlerta(); // Toca o áudio novamente se a condição ainda for verdadeira
            }else{
                mensagem("Veículo ligado.");
            }
        }, 10000);
    }
}

// Função para alterar o estado do veículo ligar/desligar, ambos só são possíveis se a velocidade do veículo for igual a 0
function ligarDesligar() {
    if (veiculoLigado && velocidadeAtual === 0) {
        veiculoLigado = false;
        mensagem("Veículo desligado.");
    } else {
        if (velocidadeAtual === 0) {
            veiculoLigado = true;
            mensagem("Veículo ligado.");
        } else {
            mensagem("Não é possível desligar o veículo com velocidade diferente de 0.");
        }
    }
    atualizarVisibilidadeVideo(); // Atualiza a visibilidade do vídeo quando o estado do veículo mudar
}

// Função para acelerar o veículo
function acelerar() {
    if (veiculoLigado) {
        velocidadeAtual = Math.min(100, velocidadeAtual + 1);
        atualizarDisplayDeVelocidade();
        verificarVelocidade(); // Verifica se a velocidade atual ultrapassou a velocidade máxima após acelerar
    } else {
        mensagem("Veículo está desligado. Não é possível acelerar.");
    }
}

// Função para frear o veículo
function frear() {
    if (veiculoLigado) {
        velocidadeAtual = Math.max(0, velocidadeAtual - 1);
        atualizarDisplayDeVelocidade();
    } else {
        mensagem("Veículo está desligado. Não é possível frear");
    }
}

// Função para atualizar a velocidade atual do veículo
function atualizarDisplayDeVelocidade() {
    document.getElementById("velocidadeVeiculo").textContent = `Velocidade atual do veículo: ${velocidadeAtual} km/h`;
}

// Função do painel de mensagem
function mensagem(msg){
    const divMsg = document.getElementById("msg");
    divMsg.innerHTML = msg
}

// Função para controlar a visibilidade da câmera e do gráfico de probabilidade 
function atualizarVisibilidadeVideo() {
    const videoContainer = document.getElementById("video");
    const labelContainer = document.getElementById("label-container");
    if (veiculoLigado) {
        videoContainer.style.display = "block";
        labelContainer.style.display = "flex";
    } else {
        videoContainer.style.display = "none";
        labelContainer.style.display = "none";
    }
}

// Adicionando teclas para controle do veículo
document.addEventListener('keydown', function(event) {
    if (event.key === 'x' || event.key === 'X') {
        ligarDesligar();
        document.getElementById('btn-liga-desliga').classList.add('active');
        setTimeout(() => document.getElementById('btn-liga-desliga').classList.remove('active'), 100);
    } else if (event.key === 'w' || event.key === 'W') {
        acelerar();
        document.getElementById('btn-acelerar').classList.add('active');
        setTimeout(() => document.getElementById('btn-acelerar').classList.remove('active'), 100);
    } else if (event.key === 's' || event.key === 'S') {
        frear();
        document.getElementById('btn-frear').classList.add('active');
        setTimeout(() => document.getElementById('btn-frear').classList.remove('active'), 100);
    }
});

iniciar();
