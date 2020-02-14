let express = require('express');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let neo4j = require('neo4j-driver');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

let driver = neo4j.driver("bolt://localhost", neo4j.auth.basic("neo4j", "password"));
let session = driver.session();

// Home Route
app.get('/', (req, res)=>{
    session
        .run("MATCH (n:Person) RETURN n")
        .then((result) => {
            let personArr = [];
            
            result.records.forEach((record) => { 
                //console.log(record._fields[0]);
                personArr.push({
                    id: record._fields[0].identity.low,
                    name: record._fields[0].properties.name
                });
            });
            
            session
                .run("MATCH (n:Location) RETURN n")              
                .then((result2)  => {
                    let locationArr = [];
                    result2.records.forEach((record)  => {
                        locationArr.push(record._fields[0].properties);
                    });
                    
                    res.render('index', {
                        persons: personArr,
                        locations: locationArr
                    });
                })
                   
        })
        .catch((error)  => {
            console.log(error);
        });
});

// Add Person Route
app.post('/person/add', (req, res) => {
    let name = req.body.name;
    
    session
        .run("CREATE(n:Person {name:{nameParam}}) RETURN n.name", {nameParam: name})
        .then((result)  => {
            console.log(result);
            // session.close();
            res.redirect('/');
        })
        .catch((error) => {
            console.log(error);
        });
});


// Add Location Route
app.post('/location/add', (req, res) => {
    let city = req.body.city;
    let state = req.body.state;
    
    session
        .run("CREATE(n:Location {city:{cityParam}, state:{stateParam}}) RETURN n", {cityParam: city, stateParam:state})
        .then((result) => {
            res.redirect('/');
            // session.close();
        })
        .catch((error) => {
            console.log(error);
        });
});

// Friends Connect Route
app.post('/friends/connect', (req, res) => {
    let name1 = req.body.name1;
    let name2 = req.body.name2;
    let id = req.body.id;
    
    session
        .run("MATCH(a:Person {name:{nameParam1}}),(b:Person {name:{nameParam2}}) MERGE(a)-[r:FRIENDS]->(b) RETURN a,b", {nameParam1: name1, nameParam2:name2})
        .then((result) => {
            if(id && id != null){
                res.redirect('/person/'+id);
            } else{
                res.redirect('/');
            }
            // session.close();
        })
        .catch((error)  => {
            console.log(error);
        });
});

// Add Birthplace Route
app.post('/person/born/add', (req, res)  => {
    let name = req.body.name;
    let city = req.body.city;
    let state = req.body.state;
    let year = req.body.year;
    let id = req.body.id;
    
    session
        .run("MATCH(a:Person {name:{nameParam}}),(b:Location {city:{cityParam}, state:{stateParam}}) MERGE(a)-[r:BORN_IN {year:{yearParam}}]->(b) RETURN a,b", {nameParam: name, cityParam:city, stateParam:state,yearParam:year})
        .then((result) => {
            if(id && id != null){
                res.redirect('/person/'+id);
            } else{
                res.redirect('/');
            }
            // session.close();
        })
        .catch((error) => {
            console.log(error);
        });
});

// Person Route
app.get('/person/:id', (req, res)  => {
    let id = req.params.id;
    
    session
        .run("MATCH(a:Person) WHERE id(a)=toInt({idParam}) RETURN a.name as name", {idParam:id})
        .then((result)  => {
            let name = result.records[0].get("name");
            
            session
                .run("OPTIONAL MATCH (a:Person)-[r:BORN_IN]-(b:Location) WHERE id(a)=toInt({idParam}) RETURN b.city as city, b.state as state", {idParam:id})
                .then((result2)  => {
                    let city = result2.records[0].get("city");
                    let state = result2.records[0].get("state");
                    
                    session
                        .run("OPTIONAL MATCH (a:Person)-[r:FRIENDS]-(b:Person) WHERE id(a)=toInt({idParam}) RETURN b", {idParam:id})
                        .then((result3)  => {
                            let friendsArr = [];
                            
                            result3.records.forEach((record) => {
                                if(record._fields[0] != null){
                                    friendsArr.push({
                                        id: record._fields[0].identity.low,
                                        name: record._fields[0].properties.name
                                    });
                                }
                            });
                            
                            res.render('person',{
                                id:id,
                                name:name,
                                city:city,
                                state: state,
                                friends:friendsArr
                            });
                            // session.close();
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                });
        });
});

app.listen(3000);

console.log('Server started on port 3000');

module.exports = app;