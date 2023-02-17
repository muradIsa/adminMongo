var MongoClient = require('mongodb').MongoClient;

exports.addConnection = function (connection, app, callback){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    if(!connection.connOptions){
        connection.connOptions = {};
    }

    MongoClient.connect(connection.connString, connection.connOptions).then(function(database){
        var dbObj = {};
        dbObj.native = database;
        dbObj.connString = connection.connString;
        dbObj.connOptions = connection.connOptions;
        dbObj.db = (connection.connString.match(/mongodb:\/\/[\d.]+:\d+\/(.+)$/) || [])[1] || null;

        app.locals.dbConnections[connection.connName] = null;
        app.locals.dbConnections[connection.connName] = dbObj;
        callback(null, null);
    }, function(err){
        callback(err, null);
    });
};

exports.removeConnection = function (connection, app){
    if(!app.locals.dbConnections){
        app.locals.dbConnections = [];
    }

    try{
        app.locals.dbConnections[connection].native.close();
    }catch(e){}

    delete app.locals.dbConnections[connection];
    return;
};
