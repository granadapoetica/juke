var dotenv       = require('dotenv');  
dotenv.config();

const fs     = require('fs');
var   mapa ; 
var   diretorios = [];
var   contDiretorios = 0; 
var   nedb         = require('nedb');
var   db           = new nedb({filename: 'juke.db', autoload: true});
var pilhaMusicas   = [];
var pilhaAlbuns    = []; 
var playlist       = [];
var pilhaBandas    = [];
var naoMapeadas    = [];
var diretorioUsb   = process.env.PATH_USB;
var contDiretorios2 = 0; 

function buscaDiretorios(){
    fs.readdir(diretorioUsb, { withFileTypes: true }, (error, files) => {
        const directoriesInDIrectory = files
            .filter((item) => item.isDirectory())            
            .map((item) => item.name);

        let itemToBeRemoved = [".Trash-1000","jukebox","LOST.DIR","juke","System Volume Information"];
        diretorios = directoriesInDIrectory.filter(item => !itemToBeRemoved.includes(item));                                          
        
        parserDiretorios(diretorios[0]);                
    });
}
function parserDiretorios(diretorio){  
    var path  = diretorioUsb + diretorio + '/mapa.json';
    fs.exists(path, (e) => {         
        if(e){
            fs.readFile(path, (err, data) => {
                if (err) console.log(err);
        
                mapa = JSON.parse(data);
                bootstrapMusicas(0,0);   
            });              
        }else{
           boostrapPlayList();
        }         
    });            
} 
function boostrapPlayList(){	
    playlist.push({ Bandas : pilhaBandas , Letra: mapa.Banda.substring(0,1) });
    console.log('Playlist:',playlist); 
    console.log('Diretorios:',diretorios.length); 
	if((contDiretorios + 1) < diretorios.length){ 	
   	   pilhaMusicas   = [];
  	   pilhaAlbuns    = [];  	   
	   pilhaBandas    = [];

	   contDiretorios++; 	
	   parserDiretorios(diretorios[contDiretorios]); 
	}else{         
	    
        db.insert(playlist, function(err){
	      if(err) return console.log(err);
                 	      
          console.log('BootStrap Gerado com sucesso.'); 	          
          console.log('Pastas nao mapeadas:',naoMapeadas);                                   
	   });
	}	 
}

function bootStrapBandas(){
	var Banda = { mestre : mapa.Banda , Albuns : pilhaAlbuns, Letra: mapa.Banda.substring(0,1), imgMestre: mapa.ImgBanda, detalhes: mapa.detalhesBanda };
    
	db.insert(Banda, function(err){
	    if(err) return console.log(err); 
				
		db.find({ mestre : Banda.mestre },function (err,retorno) {  	           
			pilhaBandas.push(retorno[0]); 	
			//console.log('bootStrapBandas',retorno[0]); 	
			boostrapPlayList();	
		});				
	}); 	
} 

async function ArquivoExiste (path){  
  try {
    await Fs.access(path);
    return true
  } catch {
    return false
  }
}

function bootStrapAlbum(k){
	var album = { mestre : mapa.Albuns[k].Nome , Musicas: pilhaMusicas, detalhes: mapa.Albuns[k].detalhes, imgMestre: mapa.Albuns[k].CapaAlbum };
    //console.log('=============================================================================================================================='); 
    //console.log('Album:',album); 
	db.insert(album, function(err){
	   if(err) return console.log('Boostrap Albuns:',err); 
				
	   db.find({ mestre : album.mestre },function (err,retorno){
			pilhaAlbuns.push(retorno[0]);
            
            //console.log('=============================================================================================================================='); 
            //console.log('Retorno album:',retorno[0]);     
            
			if((k + 1)  === mapa.Albuns.length){ 
              bootStrapBandas();	
            }else{
               pilhaMusicas.length = 0; 
               bootstrapMusicas(k + 1,0);  
            }
		});		
	});   	
}

function bootstrapMusicas(k,i){	
	// Cadastra todas as músicas  		
	if((i) === mapa.Albuns[k].Musicas.length){ 				 		
        bootStrapAlbum(k);
    }else{
        var musica = { mestre : mapa.Albuns[k].Musicas[i].Mestre , Track : mapa.Albuns[k].Musicas[i].Track };               
        
        db.insert(musica, function(err){
            if(err) return console.log(err); 
						
            db.find({ mestre : musica.mestre },function (err,retorno){  	           
                //console.log('==============================================================================================================================');    
                //console.log('retorno musica',retorno[0]);    
                pilhaMusicas.push(retorno[0]); 						               
                bootstrapMusicas(k,i + 1);  				   
			});			
		});        
	}	 
}

buscaDiretorios();
