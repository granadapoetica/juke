	var dotenv       = require('dotenv');
	dotenv.config();

	const express    = require('express');
	const path       = require('path');
	var nedb         = require('nedb');
	var jp           = require('jsonpath');
	const app        = express();
	var http         = require('http').Server(app);
	var io           = require('socket.io')(http);
	var port         = process.env.PORT;
    var db           = new nedb({ filename: process.env.BANCO, autoload: true });
    const fs         = require('fs');

	var letras       = undefined;
    console.log("Modo",process.env.MODO); 	
	if(process.env.MODO !== 'DEV')
	{ 
	   const InputEvent = require('input-event');	
	   const input      = new InputEvent('/dev/input/'+ process.env.CONTROLE);
	   input.on('data',function(buffer){
 	         var comandoControle = '';
		 if(buffer.value === 0){
            switch(buffer.code){
			   case process.env.DESCER   : comandoControle = 'descer'   ;break;
			   case process.env.SUBIR    : comandoControle = 'subir'    ;break;
			   case process.env.AVANCAR  : comandoControle = 'avancar'  ;break;
			   case process.env.RETORNAR : comandoControle = 'retornar' ;break;
			   case process.env.TOCAR    : comandoControle = 'tocar'    ;break;
               case process.env.PLAYLIST : comandoControle = 'playlist' ;break;
               case process.env.MAXIMIZAR: comandoControle = 'maximizar';break; 
               case process.env.PULAR    : comandoControle = 'pular'    ;break;   
            }
		    console.log(buffer.code); 
		    if(comandoControle !== '')
	           comunicaAoCliente(comandoControle);
          }
	   });
	}
	app.use(express.static(path.join(__dirname, 'public')));
	/***************************  Socket.io     ************************************/
	/*******************************************************************************/
	app.get('/', function(req, res)
	{
	    if(process.env.MODO !== 'DEV'){
           res.sendFile(__dirname + '/indexDev.html');            
        }else{ 
           res.sendFile(__dirname + '/index.html');
        }
	});

	app.get('/video', function(req, res){
		try {
			const path = process.env.PATH_USB + req.query.parametro;
			console.log(path);
			const fs = require('fs');
			const stat = fs.statSync(path)
			const fileSize = stat.size
			const range = req.headers.range

			if (range){
				const parts = range.replace(/bytes=/, "").split("-");
				const start = parseInt(parts[0], 10);
				const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
				const chunksize = (end-start)+1
				const file = fs.createReadStream(path, {start, end});

				const head = {
				  'Content-Range': `bytes ${start}-${end}/${fileSize}`,
				  'Accept-Ranges': 'bytes',
				  'Content-Length': chunksize,
				  'Content-Type': 'audio/mpeg',
				}
				res.writeHead(206, head);
				file.pipe(res);

			}else{
				const head ={ 'Content-Length': fileSize, 'Content-Type': 'audio/mpeg'};
				res.writeHead(200, head);
				fs.createReadStream(path).pipe(res);
			}
		}catch(e){
			console.log('Erro ao ler o video:'+ req.query.parametro);
			res.end('Error');
		}
    });
    
    app.get('/PlayList',  async (req, res, next) => {
		console.log(req.query.parametro); 			
  	    res.send(recuperaTodasMusicas());	
	});	    
    
    app.get('/bandas', function(req, res)
	{
		carregaBandas(req, res);		
	});
	
    function carregaBandas(req, res){
		bandas = [];
        console.log('Path:',process.env.PATH_USB);                             
		fs.readdir("/media/cezar/D161-B188/", (err, files) => {			
			
			files.forEach(file => {
			   if(path.extname(file) === '') 
			      bandas.push({ "Nome": file, Albuns: [] }); 								
			});
			res.send(bandas);
		});
	}	
    
	app.post('/configurando', function(req, res)
	{			
		var banda = '';
		banda = req.query.Banda;        
		fs.readFile(process.env.PATH_USB + "/" + banda +'/mapa.json', "utf8", (err, jsonString) => {
			if (err) {
				console.log("Error", err);
				return;
			}
			try {
				var mapa1 = JSON.parse(jsonString); 
				this.mapa = mapa1; 
				res.send(mapa1);
			}catch (err){
				console.log("Error parsing JSON string:", err);
			}		
		});
	});
		
	app.post('/gravar', function(req, res)
	{
		gravaArquivo(req, res);		
	});
	
	function gravaArquivo(req,res){ 		                
		fs.writeFileSync(process.env.PATH_USB +"/"+ req.query.BandaSel + '/mapa.json',req.query.Mapa);
		res.send({"resultado": "OK"});
	} 
    
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
		console.log('Bandas',names); 
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

	function recuperaTodasMusicas(){
        var names = jp.query(letras, '$..Musicas');
		return names;	        
    } 
	io.on('connection', function(socket)
	{
	  console.log('conectado....!'); 
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
		console.log(msg); 
		io.emit('messageBroadcast', msg);
	} 
	/*******************************************************************************/
