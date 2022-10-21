	const express    = require('express');
	const path       = require('path');
	const app        = express();
	var http         = require('http').Server(app);
	var io           = require('socket.io')(http);
	var port         = process.env.PORT || 3008;
	var nedb         = require('nedb');
    var db           = new nedb({filename: 'bootstrap.db', autoload: true});
	var jp           = require('jsonpath');
	var letras       = undefined;
	
	const InputEvent = require('../');
	const input      = new InputEvent('/dev/input/event6');
	
	input.on('data',function(buffer){
		console.log('teste',buffer); 
	});
	
	app.use(express.static(path.join(__dirname, 'public')));
	/***************************  Socket.io     ************************************/
	/*******************************************************************************/
	app.get('/', function(req, res)
	{
	  res.sendFile(__dirname + '/noise.html');
	});
	
	app.post('/Bandas',  async (req, res, next) => {
		console.log('Letra recebida',req.query.parametro); 			
  	    res.send(recuperaBandasPorLetra(req.query.parametro));	
	});	

	app.post('/Albuns',  async (req, res, next) => {
		console.log(req.query.parametro); 			
  	    res.send(recuperaAlbunsPorBanda(req.query.parametro));	
	});	

	app.post('/Musicas',  async (req, res, next) => {
		console.log(req.query.parametro); 			
  	    res.send(recuperaMusicasPorAlbum(req.query.parametro));	
	});	
		
	function recuperaBandasPorLetra(Letra){
		var names = jp.query(letras, '$..Bandas[?(@.Letra =="'+ Letra +'")]');
		return names;	
	}
 
	function recuperaAlbunsPorBanda(idBanda){
		var names = jp.query(letras, '$..Bandas[?(@._id =="'+ idBanda +'")]');
		return names[0].Albuns;	
	} 

	function recuperaMusicasPorAlbum(idAlbum){
		var names = jp.query(letras, '$..Albuns[?(@._id =="'+ idAlbum +'")]');
		return names[0].Musicas;	
	}

	io.on('connection', function(socket)
	{
	  socket.on('messageBroadcast', function(etapaAtual)
	  {	
		console.log('etapa:',etapaAtual);
		comunicaAoCliente(etapaAtual);	
	  });
	});
	
	http.listen(port, function(){
		db.find({}, function (err, Bandas){
			if(err) return console.log(err);
						
			letras = Bandas;		
		});	
		console.log('listening on *:'+ port);
	});
	function comunicaAoCliente(msg)
	{
		io.emit('messageBroadcast', msg);
	} 
	/*******************************************************************************/