var express = require('express'); // requisita a biblioteca para a criacao dos serviços web.
 var pg = require("pg"); // requisita a biblioteca pg para a comunicacao com o banco de dados.

 var sw = express(); // iniciliaza uma variavel chamada app que possitilitará a criação dos serviços e rotas.

 sw.use(express.json());//padrao de mensagens em json.

 sw.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});

const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'db_cs_lpbd_2021_2',
    password: '123456',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('Hello, world! meu primeiro teste.  #####');
})

sw.get('/listjogador', function (req, res) {

    //estabelece uma conexao com o bd.
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Não conseguiu acessar o BD :"+ err);
           res.status(400).send('{'+err+'}');
       }else{
        client.query('select j.nickname, j.senha, j.quantpontos, j.quantdinheiro, to_char(j.datacadastro, \'dd/mm/yyyy\') as datacadastro, to_char(j.data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, j.situacao, e.cep, e.complemento, e.codigo from tb_jogador j left join tb_endereco e on (j.nickname=e.nicknamejogador) order by j.datacadastro asc;',function(err,result) {        
                done(); // closing the connection;
                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{
                    res.status(200).send(result.rows);
                }
                
            });
       } 
    });
});

sw.get('/deletejogador/:nickname', (req, res) => {

    postgres.connect(function(err,client,done) {
        if(err){
            console.log("Não conseguiu acessar o banco de dados!"+ err);
            res.status(400).send('{'+err+'}');
        }else{          
            var q1 ={
                text: 'delete FROM tb_endereco where nicknamejogador = $1',
                values: [req.params.nickname]
            }
            var q2 ={
                text: 'delete FROM tb_jogador where nickname = $1',
                values: [req.params.nickname]
            }
            client.query( q1 , function(err,result) {
                
                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query( q2 , function(err,result) {
                        done();// closing the connection;
                        if(err){
                            console.log(err);
                            res.status(400).send('{'+err+'}');
                        }else{
                            res.status(200).send({'nickname': req.params.nickname});//retorna o nickname deletado.
                        }                    
                    })
                }
            });
        } 
     });
});

sw.post('/insertjogador', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q1 ={
                text: 'insert into tb_jogador (nickname, senha, quantPontos, quantdinheiro, datacadastro, ' +
                   ' situacao) ' +
                ' values ($1,$2,$3,$4,now(), $5) ' +
                                            'returning nickname, senha, quantpontos, quantdinheiro, ' +
                                            ' to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, '+
                                            ' to_char(data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, situacao;',
                values: [req.body.nickname, 
                         req.body.senha, 
                         req.body.quantpontos, 
                         req.body.quantdinheiro, 
                         req.body.situacao == true ? "A" : "I"]
            }
            var q2 = {
                text : 'insert into tb_endereco (complemento, cep, nicknamejogador) values ($1, $2, $3) returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento, 
                         req.body.endereco.cep, 
                         req.body.nickname]
            }
            console.log(q1);

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no insert');
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query(q2, function(err,result2) {
                        if(err){
                            console.log('retornou 400 no insert');
                            res.status(400).send('{'+err+'}');
                        }else{
                            done(); // closing the connection;
                            console.log('retornou 201 no insertjogador');
                            res.status(201).send({"nickname" : result1.rows[0].nickname, 
                                                  "senha": result1.rows[0].senha, 
                                                  "quantpontos": result1.rows[0].quantpontos, 
                                                  "quantdinheiro": result1.rows[0].quantdinheiro,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento}});
                        }
                    });
                }           
            });
       }       
    });
});

sw.post('/updatejogador', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q1 ={
                text: 'update tb_jogador set senha = $1, quantPontos = $2, quantdinheiro = $3, situacao = $4 where nickname = $5 ' +
                                            'returning nickname, senha, quantpontos, quantdinheiro, to_char(datacadastro, \'dd/mm/yyyy\') as datacadastro, situacao;',
                values: [ 
                         req.body.senha, 
                         req.body.quantpontos, 
                         req.body.quantdinheiro, 
                         req.body.situacao == true ? "A" : "I",
                         req.body.nickname]
            }
            var q2 = {
                text : 'update tb_endereco set complemento = $1, cep = $2 where nicknamejogador = $3 returning codigo, complemento, cep;',
                values: [req.body.endereco.complemento, 
                         req.body.endereco.cep, 
                         req.body.nickname]
            }
            console.log(q1);
            console.log(q2);

            client.query(q1, function(err,result1) {
                if(err){
                    console.log('retornou 400 no update');
                    console.log(err)
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query(q2, function(err,result2) {
                        if(err){
                            console.log(err);
                            console.log('retornou 400 no updatejogador');
                            res.status(400).send('{'+err+'}');
                        }else{
                            
                            done(); // closing the connection;

                            console.log('retornou 201 no updatejogador');
                            res.status(201).send({"nickname" : result1.rows[0].nickname, 
                                                  "senha": result1.rows[0].senha, 
                                                  "quantpontos": result1.rows[0].quantpontos, 
                                                  "quantdinheiro": result1.rows[0].quantdinheiro,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento}});
                        }
                    });
                }           
            });
       }       
    });
});


sw.get('/listmodo', function (req, res) {

    //estabelece uma conexao com o bd.
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Não conseguiu acessar o BD :"+ err);
           res.status(400).send('{'+err+'}');
       }else{
        client.query('select nome, codigo, to_char(datacriacao, \'yyyy-mm-dd\') as datacriacao, quantboots, quantrounds from tb_modo order by datacriacao asc;',function(err,result) {        
                done(); // closing the connection;
                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{
                    res.status(200).send(result.rows);
                }
                
            });
       } 
    });
});

sw.post('/insertendereco', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={                
                text: 'insert into tb_endereco (complemento, cep, nicknamejogador) values ($1, $2, $3 ) returning codigo, complemento, cep, nicknamejogador',
                values: [req.body.complemento, req.body.cep, req.body.jogador.nickname]
            }
            console.log(q);
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no insertendereco');
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    console.log('retornou 201 no insertendereco');
                    res.status(201).send({"codigo" : result.rows[0].codigo,
                                          "complemento" : result.rows[0].complemento,
                                          "cep" : result.rows[0].cep,
                                          "jogador" : {"nickname": result.rows[0].nicknamejogador} });
                }           
            });
       }       
    });
});

sw.post('/updateendereco', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={                
                text: 'update tb_endereco set complemento = $1, cep = $2, nicknamejogador = $3 where codigo = $4 returning codigo, complemento, cep, nicknamejogador',
                values: [req.body.complemento, req.body.cep, req.body.jogador.nickname, req.body.codigo]
            }
            console.log(q);
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no updateendereco');
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    console.log('retornou 201 no insupdateenderecoert');
                    res.status(201).send({"codigo" : result.rows[0].codigo,
                                          "complemento" : result.rows[0].complemento,
                                          "cep" : result.rows[0].cep,
                                          "jogador" : {"nickname": result.rows[0].nicknamejogador} });
                }           
            });
       }       
    });
});

sw.get('/deleteendereco/:codigo', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={                
                text: 'delete tb_endereco where codigo = $1 returning codigo',
                values: [req.param.codigo]
            }            
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no deleteendereco');
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    console.log('retornou 201 no deleteendereco');
                    res.status(201).send({"codigo" : result.rows[0].codigo});
                }           
            });
       }       
    });
});

sw.get('/listendereco', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ='select e.codigo, e.complemento, e.cep, j.nickname from tb_endereco e, tb_jogador j where e.nicknamejogador=j.nickname order by e.codigo asc';            
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no listendereco');
                    console.log(err);
                    
                    res.status(400).send('{'+err+'}');
                }else{

                    console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }           
            });
       }       
    });
});


sw.post('/insertmodo', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={
                //insert into tb_modo (nome, datacriacao, quantboots, quantrounds) values ('teste', now(), 8, 20);
                text: 'insert into tb_modo (nome, datacriacao, quantboots, quantrounds) values ($1, now(), $2,  $3 ) returning codigo',
                values: [req.body.nome, req.body.quantboots, req.body.quantrounds]
            }
            console.log(q);
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 no insert');
                    console.log(err);
                    console.log(err.data);
                    res.status(400).send('{'+err+'}');
                }else{

                    console.log('retornou 201 no insertmodo');
                    res.status(201).send(result.rows[0]);//se não realizar o send nao finaliza o client
                }           
            });
       }       
    });
});

sw.get('/deletemodo/:codigo', (req, res) => {

    postgres.connect(function(err,client,done) {
        if(err){
            console.log("Não conseguiu acessar o banco de dados"+ err);
            res.status(400).send('{'+err+'}');
        }else{
            
            var q ={
                text: 'delete FROM tb_modo where codigo = $1',
                values: [req.params.codigo]
            }
    
            client.query( q , function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{
                    res.status(200).send({'codigo': req.params.codigo});//retorna o nickname deletado.
                }

            });
        } 
     });
});

sw.post('/updatemodo/', (req, res) => {

    postgres.connect(function(err,client,done) {
        if(err){

            console.log("Não conseguiu acessar o BD: "+ err);
            res.status(400).send('{'+err+'}');

        }else{

            var q ={
                //update tb_modo set nome = '', quantboots = 0, quantrounds = 0 where codigo = 1;
                text: 'update tb_modo set nome = $1, quantboots = $2, quantrounds = $3 where codigo = $4',
                values: [req.body.nome, req.body.quantboots, req.body.quantrounds, req.body.codigo]
            }
            console.log(q);
     
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log("Erro no update modo: "+err);
                    res.status(400).send('{'+err+'}');
                }else{             
                    res.status(200).send(req.body);//se não realizar o send nao finaliza o client nao finaliza
                }
            });
        }
     });
});

sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});