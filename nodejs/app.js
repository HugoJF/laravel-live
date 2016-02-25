// Dependencies
var config = require('./config.js');
var port = config.port;
var express = require('express');
var app = express();
var server = app.listen(port);
var moment = require('moment');
var url = require('url');
var util = require('util');
var crypto = require('crypto');
var bbcode = require('bbcode');
var _ = require('underscore');
var io = require('socket.io').listen(server);
var sys = require('sys');
var exec = require('child_process').exec;
var jwt = require('jsonwebtoken');

var secretKey = 'WeBmL3EEYRHlxbBv7OcGzmKLRFtJvF3B';
var defaultRoom = '#csgo';

// Socket.io configuration
io.set('log level', 1);

// Express.js configuration
app.set("view options", {layout: false});
app.use(express.json());
app.use(express.compress());
app.use(express.static(__dirname + '/public', {maxAge: 60 * 60 * 24 * 7}));

// CTRL+C shutdown
process.on('SIGINT', function () {
    util.log("\nShutting down from manual SIGINT (Ctrl-C), NOW.");
    io.sockets.emit('annouce', {message: '<span class="adminMessage">SHUTTING DOWN, NOW!</span>'});
    process.exit();
});

function gracefulShutdown(kill) {
    util.log("\nShutting down from nodemon SIGUSR2 (RESTART) in 10 seconds...");
    io.sockets.emit('annouce', {message: '<span class="adminMessage">RESTARTING IN 10 SECONDS!</span>'});
    setTimeout(function () {
        io.sockets.emit('annouce', {message: '<span class="adminMessage">RESTARTING IN 5 SECONDS!</span>'});
    }, 5000);
    setTimeout(function () {
        kill()
    }, 10000);
}

// Handle /gitpull request by server
app.post('/gitpull', function (req, res) {
    var parsedUrl = url.parse(req.url, true);
    if (parsedUrl.query['secret_key'] != config.secret_key) {
        util.log("[warning] Unauthorized request " + req.url);
        res.writeHead(401, "Not Authorized", {'Content-Type': 'text/html'});
        res.end('401 - Not Authorized');
        return;
    }
    res.end();
    io.sockets.emit('annouce', {message: '<span class="adminMessage">SYSTEM UPDATE INITIATED...</span>'});
    function puts(error, stdout, stderr) {
        sys.puts(stdout)
    }

    exec("git reset --hard HEAD", puts);
    exec("git pull", puts);
    var arr = req.body.commits[0].modified;
    if ((arr.join(',').indexOf("app.min.js") > -1) || (arr.join(',').indexOf("app.min.css") > -1) || (arr.join(',').indexOf("index.html") > -1)) {
        io.sockets.emit('annouce', {message: '<span class="adminMessage">SYSTEM UPDATE COMPLETE, BROWSER RELOAD IS NECCESARY.</span>'});
    } else {
        io.sockets.emit('annouce', {message: '<span class="adminMessage">SYSTEM UPDATE COMPLETE, BROWSER RELOAD IS NOT NECCESARY.</span>'});
    }
});

// Home page
app.get('/', function (req, res) {
    res.render('index.html');
});

// Redirect every GET request to home page
app.get('*', function (req, res) {
    res.redirect('/');
});

// Array that holds current users
// Array element example:
// 0: "Guest5265"
// 1: "bDiHUuILGuszOqgT-fDh"
// 2: false
var users = [];

// Array that holds registered users
var registered_users = [];

// Enables console
process.stdin.resume();
process.stdin.setEncoding('utf8');

// Listens for console commands
process.stdin.on('data', function (chunk) {
    // Removes and new line chars
    chunk = chomp(chunk)

    // Check if it's a command
    if (chunk[0] == "/") {
        // Execute command as admin
        parseAdminCommand(chunk);
    } else {
        // If it's not a command, it's an announcement
        io.sockets.emit('annouce', {message: '<span class="adminMessage">' + chunk.toUpperCase() + '</span>'});
    }
});

// Removes any new line especial characters
function chomp(raw_text) {
    return raw_text.replace(/(\n|\r)+$/, '');
}

// Procura o object Socket de um usuario em especifico
function findSocket(user) {
    for (var i = users.length; i--;) {
        if (users[i][0] == user) {
            return users[i][1];
        }
    }
    return 0;
}

// Processa comando de administrador
function parseAdminCommand(data) {
    // Remove espacos no inicio e fim da String e divide usando espacos como delimitadores
    // Exemplo: /kick Usuario Motivo vira: [0] = '/kick'
    //                                     [1] = 'Usuario'
    //                                     [2] = 'Motivo'
    var res = data.trim().split(" ");

    // Se o commando foi kick e existir pelo menos 1 parametro
    if (res[0].toLowerCase() == "/kick" && res.length >= 2) {
        // Separa o nome do usuario
        var user = res[1];

        // Junta todos os proximos parametros em uma unica String
        var reason = res.slice(2, res.length).join(' ');

        // Executa o kick
        kick(user, reason);

        // Sai da funcao
        return;
    }

    /* SIGUSR2 Nao suportado pelo Node.js
     if(res[0].toLowerCase() == "/restart" && res.length == 1){
     process.kill(process.pid, 'SIGUSR2');
     return;
     }
     */

    // Se o comando for shutdown e nao existir outros parametros
    if (res[0].toLowerCase() == "/shutdown" && res.length == 1) {
        // Loga no console que o servidor esta desligando
        util.log("\nShutting down from manual SIGINT (/shutdown), NOW.");

        // Emite um anuncio para os usuarios no chat que o servidor estara fechando
        io.sockets.emit('annouce', {message: '<span class="adminMessage">SHUTTING DOWN, NOW!</span>'});

        // Para processo do servidor
        process.exit();

        // Sai da funcao
        return;
    }

    // Se o codigo chegou nesse ponto, o comando executado no console nao existe

    // Loga no console que o comando executado nao existe
    util.log('Unknown command \'' + data + '\'');

    // Mostra pro usuario comandos existentes
    util.log('Available commands are: \n  /kick user reason\n  message\n  /restart -- deprecated\n  /shutdown\n');
}

// Retorna 'true' se usuario esta conectado, 'false' se nao
function findUser(user) {
    for (var i = users.length; i--;) {
        if (users[i][0] == user) {
            return true;
        }
    }
    return false;
}

// Procura e remove 'item' dentro de 'arr'
function removeItem(arr, item) {
    for (var i = arr.length; i--;) {
        if (arr[i][0].toString() === item[0].toString()) {
            arr.splice(i, 1);
        }
    }
}

// Funcao para kickar usuario
function kick(data, reason) {
    // Check if user is connected
    if (!findUser(data)) {
        // Log what name we are trying to kick
        util.log('No such user \'' + data + '\'');

        // Termina funcao
        return;
    }

    // Pega o Socket que o usuario que queremos kickar esta conectado
    var victim = io.sockets.socket(findSocket(data));

    // Comeca construir mensagem para usuario sendo kickado
    var msg = '<span class="adminMessage">YOU HAVE BEEN KICKED BY THE ADMIN. ';

    // Se existe um motivo, adicione na mensagem
    if (reason !== undefined && reason != null && reason != '') {
        msg += 'REASON: ' + reason;
    }
    // Fecha tag <span> da mensagem
    msg += '</span>';

    // Envia mensagem para o usuario sendo kickado
    victim.emit('annouce', {message: msg});

    // Procura e remove o
    removeItem(users, [data]);

    // Disconecta socket que usuario esta conectado ao chat
    victim.disconnect();

    // Loga no console que o usuario foi kickado
    util.log('\'' + data + '\' has been kicked.');
}

// Utilizado pra transformar caracteres especiais HTML para entidades HTML
var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
};

// Remove todos os caracteres especiais de uma string e substitui por entidades HTML
function escapeHtml(string) {
    return String(string).replace(/[&<>"']/g, function (s) {
        return entityMap[s];
    });
}


// Define callback quando algum usuario conecta no servidor
io.sockets.on('connection', function (socket) {


    // Evento do PHP se comunicando
    socket.on('php_announce', function (message) {
        io.sockets.emit('annouce', {message: "<span class='adminMessage'>" + message.message + "</span>"});
    });

    // Token JWT
    var token = socket.handshake.query.token;

    // Token decodificado
    var decodedToken = jwt.decode(token);

    // Sobrescreve o default room

    if(decodedToken.defaultRoom !== undefined) {
        defaultRoom = decodedToken.defaultRoom;
    }

    console.log('Default room: ' + defaultRoom);


    // Verificacao
    try {
        jwt.verify(token, secretKey);
    } catch (e) {
        var help = "<span class='adminMessage'>UNABLE TO AUTHENTICATE, INVALID TOKEN</span>";

        // Envia para o usuario em questao
        socket.emit('annouce', {message: help});
        return;
    }

    socket.emit('annouce', {message: "<span class='adminMessage'>Successfully authenticated with JWT token!</span>"});

    console.log(jwt.decode(token));

    // Nome do usuario
    var name = '';

    // Momento da ultima mensagem (UNIX)
    var lastMessage = moment();

    // Quantidade de alertas de flood
    var rateLimitWarns = 0;

    // Controles de flood, quantidade de mensagens e timer
    var floodTimer = moment();
    var floodMessages = 0;

    // Tempo de ban e multiplicador do tempo de ban
    var baseBan = 30; // seconds
    var banExponent = 0;

    // Executa um reset nos controles de spam a cada 5000ms
    setInterval(function () {
        floodTimer = moment;
        floodMessages = 0;
    }, 5000);

    // Ate quando o usuario esta banido
    var banFrom = moment();

    // Define a sala padrao
    var currentRoom = defaultRoom;

    // Coloca a conexao atual na sala padrao
    socket.join(currentRoom);

    // Dispara evento pro cliente de troca de sala
    socket.emit('channel', {channel: currentRoom});

    // Transmite mensagem para todas as conexoes atuais
    function broadcast(data) {
        io.sockets.emit('annouce', {message: data});
    }

    // Processa comando executado do usuario
    function parseServerCommand(data) {
        // Remove espacos extra no inicio e fim da string e separa a string utilizando espacos como delimitadores
        var res = data.message.trim().split(" ");


        // Comando de mensagem privada
        if (res[0].toLowerCase() == "/pm") {
            // Se o usuario passou corretamente o usuario que ele quer mandar a mensagem, e a mensagem
            if (res.length >= 3) {
                // Verifica se o destinatario eh o servidor
                if (res[1] == 'SERVER') {
                    // Cria mensagem de ajuda para o usuario notificando que ele nao pode enviar mensagem para o servidor
                    var help = "<span class='serverMessage'>You cannot PM the server.</span>";

                    // Envia mensagem para o usuario em questao
                    socket.emit('annouce', {message: help});

                    // Sai da funcao
                    return;
                }

                // Procura destinatario da PM
                if (findUser(res[1])) {
                    // Separa destinatario da PM
                    var dest = res[1];

                    // Cria a mensagem a ser enviada
                    var message = res.slice(2, res.length).join(' ');

                    // Envia PM
                    pm(dest, message);

                    // Sai da funcao
                    return;

                    // Magica (tenta achar usuario com espaco no nome)
                } else if (findUser(res.slice(1, 3).join(' '))) {
                    pm(res.slice(1, 3).join(' '), res.slice(3, res.length).join(' '));
                    return;
                    // Caso o destinatario nao
                } else {
                    // Cria mensagem de ajuda
                    var help = "<span class='serverMessage'>User not found for command '" + res.join(' ') + "'</span>";

                    // Envia para o usuario em questao
                    socket.emit('annouce', {message: help});

                    // Sai da funcao
                    return;
                }
            } else {
                // Cria mensagem de ajuda caso o usuario nao tenha passado os parametros necessarios para enviar uma PM
                var help = "<span class='serverMessage'>Invalid syntax, please use '/pm nick message'.</span>";

                // Envia para o usuario em questao
                socket.emit('annouce', {message: help});

                // Sai da funcao
                return;
            }
        }

        // Comando de listagem de canais ativos
        if (res[0].toLowerCase() == "/channels") {
            // Envia lista de canais ativos para o usuario em questao
            socket.emit('annouce', {message: "<span class='serverMessage'>Active channels:" + Object.keys(io.sockets.manager.rooms).join('<br>').replace(/\//g, '') + "</span>"});

            // Sai da funcao
            return;
        }

        // Lista comandos existentes
        if (res[0].toLowerCase() == "/help") {
            sendHelp();
            return;
        }

        unrecognized(res[0]);
    }

    // Envia mensagem privada
    function pm(dest, data) {
        // Verifica se o usuario quer mandar mensagem para ele mesmo
        if (dest == name) {
            var help = "<span class='serverMessage'>You cannot PM yourself.</span>";
            socket.emit('annouce', {message: help});
            return;
        }
        // Cria a mensagem privada
        data = '<span class="pm">&lt;to ' + dest + '&gt; ' + data + '</span>';

        // Envia a mensagem para o destinatario
        io.sockets.socket(findSocket(dest)).emit('broadcast', {client: name, message: data});

        // Envia a mensagem para remetente
        socket.emit('pm', {client: name, message: data});
    }

    function register(password) {
        // Verifica se o usuario atual ja esta verificado
        if (_.where(registered_users, {"name": name}).length > 0) {
            var help = "<span class='serverMessage'>That nick is already registered!</span>";
            socket.emit('annouce', {message: help});
            return;
        } else {
            // Adiciona nova entrada na lista de usuarios registrados
            registered_users.push({"name": name, "password": password});

            // Envia mensagem pro usuario que o nick foi registrado
            var help = "<span class='serverMessage'>Your nick has been registered!</span>";
            socket.emit('annouce', {message: help});
            return;
        }
    }

    // Retorna nome do usuario a partir da ID
    function parseUser(data) {
        // Para cada index em 'users'
        for (user in users) {
            // Acessa a ID do usuario e compara com o parametro fornecido
            if (users[user][1] == data) {
                // Retorna o nome do usuario
                return users[user][0];
            }
        }
    }

    function getChannelUsers() {
        // Lista dos usuarios com elementos HTML
        var usersInChannel = '';
        // Array of Sockets
        var clients = io.sockets.clients(currentRoom);

        // Para cada index em clients
        for (var client in clients) {
            // Adiciona nome do usuario (acessa ID do array clients, e passa para parseUser que retorna o nome do usuario)
            usersInChannel += '<br>' + parseUser(clients[client].id);
        }

        // Envia mensagem para o usuario que pediu a lista de usuarios
        socket.emit('annouce', {message: "<span class='serverMessage'>Users in " + currentRoom + ":" + usersInChannel.replace(/\//g, '') + "</span>"});
    }

    function joinRoom(data) {
        // Transforma elementos HTML para entidades HTML
        var room = escapeHtml(data);

        //Verifica se o usuario esta querendo entrar na sala que ele atualmente esta
        if (data.toLowerCase() == currentRoom.toLowerCase()) {
            var help = "<span class='serverMessage'>You are already in " + currentRoom + "</span>";
            socket.emit('annouce', {message: help});
            return;
        }

        // Sai da sala atual
        socket.leave(currentRoom);

        // Envia mensagem para todos da sala que o usuario saiu
        io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has left " + currentRoom + ".</span>"});

        // Envia mensagem pro proprio usuario que ele saiu da sala
        socket.emit('annouce', {message: "<span class='serverMessage'>" + name + " has left " + currentRoom + ".</span>"});

        // Entra na sala desejada
        socket.join(room);

        // Atualiza a variavel de sala atual
        currentRoom = room;

        // Emite evento de troca de sala para usuario
        socket.emit('channel', {channel: currentRoom});

        // Envia notificacao para todos os usuarios da nova sala, que alguem entrou
        io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has entered " + currentRoom + ".</span>"});
    }

    function leaveRoom(data) {
        // Se o usuario nao esta entrando em outra sala, ele nao pode sair da sala padrao
        if (currentRoom.toLowerCase() == defaultRoom) { // FIX, comparacao hard-coded
            var help = "<span class='serverMessage'>You cannot leave the default room (" + currentRoom + ")</span>";
            socket.emit('annouce', {message: help});
            return;
        }
        // Sai da sala
        socket.leave(currentRoom);
        // Envia notificacoes que o usuario saiu da sala
        io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has left " + currentRoom + ".</span>"});
        socket.emit('annouce', {message: "<span class='serverMessage'>" + name + " has left " + currentRoom + ".</span>"});

        // Entra na sala padrao
        socket.join(defaultRoom); // FIX hard-code
        currentRoom = defaultRoom; // FIX hard-code

        // Emite evento de troca de sala para o usuario
        socket.emit('channel', {channel: currentRoom});

        // Notifica todos da nova sala que o usuario entrou
        io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has entered " + currentRoom + ".</span>"});
    }

    function checkRegistered(nick, password) {
        // Procura nome do usuario na lista de registrados
        var user = _.where(registered_users, {"name": nick});
        if (user.length > 0) {
            if (user[0].password == password) {
                // Retorna false para updateName() nao considerar que o nome ja esta registrado (se ele acertou o nome e a senha)
                return false;
            }
            return true;
        }
        return false;
    }

    function updateName(data, password) {
        data = escapeHtml(data).trim();

        // Novo nome precisa ser uma string
        if (typeof data != 'string') {
            socket.emit('annouce', {message: "<span class='serverMessage'>That nick is not a string!</span>"});
            return;
        }

        // Precisa conter apenas letras
        if (!isLetter(data)) {
            socket.emit('annouce', {message: "<span class='serverMessage'>No special characters or spaces in Nicks!</span>"});
            return;
        }

        // Nao pode estar sendo utilizado por outro usuario
        if (findUser(data)) {
            socket.emit('annouce', {message: "<span class='serverMessage'>The nick '" + data + "' is taken!</span>"});
            return;
        }

        // Nao pode ser 'admin' ou 'server'
        if (data.toLowerCase() == "admin" || data.toLowerCase() == "server") {
            socket.emit('annouce', {message: "<span class='serverMessage'>That nick is reserved!</span>"});
            return;
        }

        // Nao pode ser um nome registrado
        if (checkRegistered(data, password)) {
            socket.emit('annouce', {message: "<span class='serverMessage'>That nick is registered by someone else!<br>If you registered this nick, please use '/nick nick password'.</span>"});
            return;
        }

        // Nao pode contar mais de 25 caracteres
        if (data.toLowerCase().length > 25) { // FIX hard-core
            socket.emit('annouce', {message: "<span class='serverMessage'>That nick is too long!</span>"});
            return;
        }
        // Deve conter pelo menos um caracter
        if (data.toLowerCase().length == 0) {
            socket.emit('annouce', {message: "<span class='serverMessage'>That nick is too short!</span>"});
            return;
        }

        // Atualiza o nome antigo
        oldName = name;

        // Substitui elements HTML por entidades HTML
        name = escapeHtml(data);

        // Remove usuario antigo do array de usuarios
        removeItem(users, [oldName, socket.id]);

        // Adiciona usuario com o novo nome
        users.push([name, socket.id, true]);

        // Emite evento de novo usuario para todos os usuarios conectados
        io.sockets.emit('users', users);

        // Emite evento de troca de nome para o usuario que trocou o nome
        socket.emit('name', {name: name});

        // Notifica todos os usuarios conectados que um usuario trocou o nome
        broadcast('<span class="serverMessage">' + oldName + ' has changed name to ' + data + '.</span>');
    }

    // Disconecta usuario atual
    function disconnect(data) {
        socket.disconnect();
    }

    // Notifica usuario atual que comando digitado nao existe
    function unrecognized(data) {
        var help = "<span class='serverMessage'>Unknown command '" + data + "'.<br>For a complete list of commands, type '/help'.</span>";
        socket.emit('annouce', {message: help});
    }

    // Envia mensagem de ajuda para o usuario atual
    function sendHelp() {
        var help = "<span class='serverMessage'>HardOrange Chat Help - Commands:<br>/pm nick message<br>/channels<br>/clear<br>/help</span>";
        socket.emit('annouce', {message: help});
    }

    // Retorna indice de item[0] (nome) dentro de arr
    function multiArrayIndex(arr, item) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i][0].toString() == item[0].toString()) {
                return i;
            }
        }
        return -1;
    }

    // Retorna se string eh composta apenas de letras
    function isLetter(s) {
        return s.match("^[a-zA-Z\(\)]+$");
    }

    // Assim que o usuario conectar, enviar mensagem de ajuda
    sendHelp();

    // Se o usuario ja foi configuraddo
    var didConfig = false;

    // Evento de configuracao do usuario
    socket.on('config', function (data) {
        // Se ja foi configurado, nao tenta configurar novamente
        if (didConfig) {
            return;
        } else {
            didConfig = true;
        }
        // Checa se os valores foram passados no evento
        if (data === undefined || data === null || data.name === undefined || data.name === null) {
            util.log('Malformed Config Packet');
            return;
        }

        // Cria nomes aleatorios ate achar um disponivel
        do {
            name = 'Guest' + Math.floor(1000 + Math.random() * 9000);
        } while (findUser(name));

        // Se ocorreu algum erro
        var error = false;


        data.name = decodedToken.name;
        console.log('Trying to log with: ' + decodedToken.name);

        if (data.name != '') {
            if (typeof data.name != 'string') {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is not a string!</span>"});
                error = true;
            }
            if (!error && !isLetter(data.name)) {
                socket.emit('annouce', {message: "<span class='serverMessage'>No special characters or spaces in Nicks!</span>"});
                error = true;
            }
            if (!error && data.name.toLowerCase() == "admin" || data.name.toLowerCase() == "server") {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is reserved!</span>"});
                error = true;
            }
            if (!error && data.password != undefined && checkRegistered(data.name, data.password)) {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is registered by someone else!<br>If you registered this nick, please use '/nick nick password'.</span>"});
                error = true;
            }
            if (!error && data.password == undefined && checkRegistered(data.name, data.password = "-1")) {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is registered by someone else!<br>If you registered this nick, please use '/nick nick password'.</span>"});
                error = true;
            }
            if (!error && data.name.toLowerCase().length > 25) {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is too long!</span>"});
                error = true;
            }
            if (!error && data.name.toLowerCase().length == 0) {
                socket.emit('annouce', {message: "<span class='serverMessage'>That nick is too short!</span>"});
                error = true;
            }
            if (!error && findUser(data.name)) {
                socket.emit('annouce', {message: "<span class='serverMessage'>The nick '" + data.name + "' is taken!</span>"});
                error = true;
            }
            if (!error) {
                name = escapeHtml(data.name);
            }
        }
        io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has entered " + currentRoom + ".</span>"});
        users.push([name, socket.id, true]);
        io.sockets.emit('users', users);
        socket.emit('name', {name: name});


        socket.on('changeRoom', function(data) {
            joinRoom(data.room);
        });

        //All Other Handlers

        socket.on('broadcast', function (data) {
            if (data === undefined || data === null || data.message === undefined || data.message === null || typeof data.message != 'string') {
                util.log('Malformed Broadcast Packet');
                return;
            }
            if (data.message.length > 500) {
                var help = "<span class='serverMessage'>Your message was too long (500 character limit).</span>";
                socket.emit('annouce', {message: help});
                return;
            }
            if (moment().diff(banFrom, 'seconds') <= baseBan * Math.pow(2, banExponent) && rateLimitWarns == 3) {
                var help = "<span class='serverMessage'>You are sending too many messages, " + baseBan * Math.pow(2, banExponent) + " second ban!</span>";
                socket.emit('annouce', {message: help});
                return;
            }

            function floodGuard() {
                var floodLimit = 7;
                floodMessages++;
                if (floodMessages >= floodLimit) {
                    return true;
                }
                return false;
            }

            if (moment().diff(lastMessage) < 400 || floodGuard()) {
                var help = "<span class='serverMessage'>You are sending too many messages!</span>";
                socket.emit('annouce', {message: help});
                rateLimitWarns++;
                if (rateLimitWarns == 3) {
                    banFrom = moment();
                    setTimeout(function () {
                        var help = "<span class='serverMessage'>" + baseBan * Math.pow(2, banExponent) + " second ban lifted, please behave.</span>";
                        socket.emit('annouce', {message: help});
                        banExponent++;
                        rateLimitWarns = 0;
                    }, baseBan * Math.pow(2, banExponent) * 1000);
                }
                return;
            }
            lastMessage = moment();
            if (data.message[0] == "/") {
                parseServerCommand(data);
            } else {
                bbcode.parse(escapeHtml(data.message), function (content) {
                    io.sockets.in(currentRoom).emit('broadcast', {client: name, message: content});
                });
            }
        });

        socket.on('status', function (data) {
            if (data === undefined || data === null || data.status === undefined || data.status === null) {
                util.log('Malformed Status Packet');
                return;
            }
            var index = multiArrayIndex(users, [name, socket.id, !data.status]);
            if (index == -1) {
                util.log('missing user: ' + name);
                return;
            }
            users[index][2] = data.status;
            io.sockets.emit('users', users);
        });

        socket.on('disconnect', function (data) {
            removeItem(users, [name, socket.id]);
            io.sockets.emit('users', users);
            io.sockets.in(currentRoom).emit('annouce', {message: "<span class='serverMessage'>" + name + " has left " + currentRoom + ".</span>"});
        });
    });
});
