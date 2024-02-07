var express = require('express'); // requisita a biblioteca para a criacao dos serviços web.
var pg = require("pg"); // requisita a biblioteca pg para a comunicacao com o banco de dados.

 var sw = express(); // iniciliaza uma variavel chamada app que possitilitará a criação dos serviços e rotas.

sw.use(express.json());//padrao de mensagens em json.
//permitir o recebimento de qualquer origem, aceitar informações no cabeçalho e permitir o métodos get e post
sw.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    next();
});


const config = {
    host: 'localhost',
    user: 'postgres',
    database: 'db_cs_prog3_2022',
    password: '123456',
    port: 5432
};

//definia conexao com o banco de dados.
const postgres = new pg.Pool(config);

//definicao do primeiro serviço web.
sw.get('/', (req, res) => {
    res.send('Hello, world! meu primeiro teste.  #####');
})


sw.post('/loginjogador', function (req, res, next) {
    
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Nao conseguiu acessar o  BD "+ err);
           res.status(400).send('{'+err+'}');
       }else{            

            var q ={
                text: 'select nickname, to_char(datacadastro, \'yyyy-mm-dd\') as datacadastro from tb_jogador where nickname = $1 and senha = $2;',
                values: [req.body.nickname, req.body.senha]
            }
            console.log(q);
    
            client.query(q,function(err,result) {
                done(); // closing the connection;
                if(err){
                    console.log('retornou 400 pelo loginjogador');
                
                    res.status(400).send('{'+err+'}');
                }else{

                    if(result.rows.length > 0){

                        res.status(201).send({"nickname":  req.body.nickname, 'datacadastro': result.rows[0].datacadastro}) 
                    }else{

                        res.status(204).send();

                    }
                }           
            });
       }       
    });
});

sw.get('/jogador/:nickname', function (req, res) {

    //estabelece uma conexao com o bd.
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Não conseguiu acessar o BD :"+ err);
           res.status(400).send('{'+err+'}');
       }else{

        var q ={
            text: 'select j.nickname, j.senha, j.quantpontos, j.quantdinheiro, to_char(j.datacadastro, \'dd/mm/yyyy\') as datacadastro, to_char(j.data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, j.situacao, e.cep, e.complemento, e.codigo, 0 as patentes from tb_jogador j left join tb_endereco e on (j.nickname=e.nicknamejogador) where nickname = $1 order by j.datacadastro asc;',
            values: [req.params.nickname]
        }

        var q2 ={
            text: 'select p.codigo, p.nome from tb_patente p, tb_jogador_conquista_patente jp where jp.codpatente=p.codigo and jp.nickname = $1',
            values: [req.params.nickname]
        }
        
        client.query(q, async function(err,result) {        
                //done(); // closing the connection;
                if(err){
                    console.log(err);
                    res.status(500).send('{'+err+'}');
                }else{  

                    client.query(q2, async function(err,result1) {

                        if(err){
                            console.log(err);
                            res.status(500).send('{'+err+'}');
                        }else{ 

                            done();  // closing the connection;                    
                            res.status(200).send({"nickname" : result.rows[0].nickname, 
                            "senha": result.rows[0].senha, 
                            "quantpontos": result.rows[0].quantpontos, 
                            "quantdinheiro": result.rows[0].quantdinheiro,
                            "situacao": result.rows[0].situacao,
                            "datacadastro" : result.rows[0].datacadastro,
                            "data_ultimo_login" : result.rows[0].data_ultimo_login,
                            "endereco": {"codigo": result.rows[0].codigo, "cep": result.rows[0].cep, "complemento": result.rows[0].complemento},
                            "patentes" : result1.rows
                            });

                        }
                    });                              

                }
                
            });
       } 
    });
});

sw.get('/listjogador', function (req, res) {

    //estabelece uma conexao 'com o bd.
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Não conseguiu acessar o BD :"+ err);
           res.status(400).send('{'+err+'}');
       }else{

        
        client.query('select j.nickname, j.senha, j.quantpontos, j.quantdinheiro, to_char(j.datacadastro, \'dd/mm/yyyy\') as datacadastro, to_char(j.data_ultimo_login, \'dd/mm/yyyy\') as data_ultimo_login, j.situacao, e.cep, e.complemento, e.codigo, 0 as patentes from tb_jogador j left join tb_endereco e on (j.nickname=e.nicknamejogador) order by j.datacadastro asc;', async function(err,result) {        
                //done(); // closing the connection;
                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{
                    
                    for(var i=0; i < result.rows.length; i++){                                              

                        try {                          

                            pj = await client.query('select p.codigo, p.nome from tb_patente p, tb_jogador_conquista_patente jp where jp.codpatente=p.codigo and jp.nickname = $1', [result.rows[i].nickname])                                                    

                            result.rows[i].patentes = pj.rows;    

                        } catch (err) {
                                                       
                            res.status(400).send('{'+err+'}');
                        }                                           

                    }

                    done();  // closing the connection;
                    res.status(200).send(result.rows);
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
                    console.log('retornou 400 no insert q1');
                    res.status(400).send('{'+err+'}');
                }else{
                    client.query(q2, async function(err,result2) {
                        if(err){
                            console.log('retornou 400 no insert q2');
                            res.status(400).send('{'+err+'}');
                        }else{
                        
                            //insere todas as pantentes na tabela associativa.
                            for(var i=0; i < req.body.patentes.length; i++){                                              

                                try {                          
        
                                    await client.query('insert into tb_jogador_conquista_patente (codpatente, nickname) values ($1, $2)', [req.body.patentes[i].codigo, req.body.nickname])
        
                                } catch (err) {
                                                                
                                    res.status(400).send('{'+err+'}');
                                }                                           
        
                            }                            

                            done(); // closing the connection;
                            console.log('retornou 201 no insertjogador');
                            res.status(201).send({"nickname" : result1.rows[0].nickname, 
                                                  "senha": result1.rows[0].senha, 
                                                  "quantpontos": result1.rows[0].quantpontos, 
                                                  "quantdinheiro": result1.rows[0].quantdinheiro,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento},
                                                  "patentes": req.body.patentes});
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
                    client.query(q2, async function(err,result2) {
                        if(err){
                            console.log(err);
                            console.log('retornou 400 no updatejogador');
                            res.status(400).send('{'+err+'}');
                        }else{


                            try {   
                                //remove todas as patentes
                                await client.query('delete from tb_jogador_conquista_patente jp where jp.nickname = $1', [req.body.nickname])

                                //insere todas as pantentes na tabela associativa.
                                for(var i=0; i < req.body.patentes.length; i++){                                              

                                    try {                          
            
                                        await client.query('insert into tb_jogador_conquista_patente (codpatente, nickname) values ($1, $2)', [req.body.patentes[i].codigo, req.body.nickname])
            
                                    } catch (err) {
                                                                   
                                        res.status(400).send('{'+err+'}');
                                    }                                           
            
                                }

                            } catch (err) {
                                                       
                                res.status(400).send('{'+err+'}');
                            } 



                            
                            done(); // closing the connection;

                            console.log('retornou 201 no updatejogador');
                            res.status(201).send({"nickname" : result1.rows[0].nickname, 
                                                  "senha": result1.rows[0].senha, 
                                                  "quantpontos": result1.rows[0].quantpontos, 
                                                  "quantdinheiro": result1.rows[0].quantdinheiro,
                                                  "situacao": result1.rows[0].situacao,
                                                  "datacadastro" : result1.rows[0].datacadastro,
                                                  "data_ultimo_login" : result1.rows[0].data_ultimo_login,
                                                  "endereco": {"codigo": result2.rows[0].codigo, "cep": result2.rows[0].cep, "complemento": result2.rows[0].complemento},
                                                  "patentes": req.body.patentes});
                        }
                    });
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

            var q0 ={
                text: 'delete FROM tb_jogador_conquista_patente where nickname = $1',
                values: [req.params.nickname]
            }
            
            var q1 ={
                text: 'delete FROM tb_endereco where nicknamejogador = $1',
                values: [req.params.nickname]
            }
            var q2 ={
                text: 'delete FROM tb_jogador where nickname = $1',
                values: [req.params.nickname]
            }

            client.query( q0 , function(err,result) {

                if(err){
                    console.log(err);
                    res.status(400).send('{'+err+'}');
                }else{

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


        } 
     });
});

sw.get('/listpatente', function (req, res) {

    //estabelece uma conexao com o bd.
    postgres.connect(function(err,client,done) {

       if(err){

           console.log("Não conseguiu acessar o BD :"+ err);
           res.status(400).send('{'+err+'}');
       }else{
        client.query('select codigo, nome from tb_patente order by codigo asc;',function(err,result) {
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

                    //console.log('retornou 201 no /listendereco');
                    res.status(201).send(result.rows);
                }           
            });
       }       
    });
});


sw.listen(4000, function () {
    console.log('Server is running.. on Port 4000');
});








