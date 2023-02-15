var express = require('express');
var router = express.Router();
var _ = require('lodash');
var common = require('./common');
var mongodb = require('mongodb');

// runs on all routes and checks password if one is setup
router.all('/document/*', common.checkLogin, function (req, res, next){
    next();
});

// Inserts a new document
router.post('/document/:conn/:db/:coll/insert_doc', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try{
        var eJsonData = ejson.parse(req.body.objectData);
    }catch(e){
        console.error('Syntax error: ' + e);
        res.status(400).json({'msg': req.i18n.__('Syntax error. Please check the syntax')});
        return;
    }

    // if it's like an array of documents, we "insertMany"
    if(_.isArrayLike(eJsonData) === true){
        mongo_db.collection(req.params.coll).insertMany(eJsonData).then(
            function (docs){
                // get the first inserted doc
                var dataReturn = '';
                if(docs.ops){
                    dataReturn = docs.ops[0]._id;
                }
                if(docs.ops === undefined){
                    res.status(400).json({'msg': req.i18n.__('Error inserting documents')});
                }else{
                    res.status(200).json({'msg': req.i18n.__('Documents successfully added'), 'doc_id': dataReturn});
                }
            },
            function (err){
                console.error('Error inserting documents', err);
            }
        );
    }else{
        // just the one document it seems so we call "save"
        mongo_db.collection(req.params.coll).insertOne(eJsonData).then(
            function (docs){
                var dataReturn = '';
                if(docs.ops){
                    dataReturn = docs.ops[0]._id;
                }
                res.status(200).json({'msg': req.i18n.__('Document successfully added'), 'doc_id': dataReturn});
            },
            function (err){
                console.error('Error inserting document', err);
                res.status(400).json({'msg': req.i18n.__('Error inserting document')});
            }
        );
    }
});

// Edits/updates an existing document
router.post('/document/:conn/:db/:coll/edit_doc', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;
    var ejson = require('mongodb-extended-json');

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    try{
        var eJsonData = ejson.parse(req.body.objectData);
    }catch(e){
        console.error('Syntax error: ' + e);
        res.status(400).json({'msg': req.i18n.__('Syntax error. Please check the syntax')});
        return;
    }

    var query  = {_id: new mongodb.ObjectId(eJsonData._id.toString())};
    delete eJsonData._id;


    mongo_db.collection(req.params.coll).replaceOne(query, eJsonData).then(
        function (doc){
            if(doc['nModified'] === 0){
                console.error('Error updating document: Document ID is incorrect');
                res.status(400).json({'msg': req.i18n.__('Error updating document: Syntax error')});
            }else{
                res.status(200).json({'msg': req.i18n.__('Document successfully updated')});
            }
        },
        function (err){
            console.error('Error updating document: ' + err);
            res.status(400).json({'msg': req.i18n.__('Error updating document') + ': ' + err});
        }
    );
});

// Deletes a document or set of documents based on a query
router.post('/document/:conn/:db/:coll/mass_delete', function (req, res, next){
    var ejson = require('mongodb-extended-json');
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    var query_obj = {};
    var validQuery = true;
    if(req.body.query){
        try{
            query_obj = ejson.parse(req.body.query);
        }catch(e){
            validQuery = false;
            query_obj = {};
        }
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);

    if(validQuery){
        console.log(query_obj);
        mongo_db.collection(req.params.coll).deleteMany(query_obj).then(
            function (docs){
                if(docs.deletedCount < 1){
                    res.status(400).json({'msg': req.i18n.__('Error deleting document(s)') + ': ' + req.i18n.__('Invalid query specified')});
                }else{
                    res.status(200).json({'msg': req.i18n.__('Document(s) successfully deleted')});
                }
            },
            function (err){
                console.error('Error deleting document(s): ' + err);
                res.status(400).json({'msg': req.i18n.__('Error deleting document(s)') + ': ' + req.i18n.__('Invalid query specified')});
            }
        );
    }else{
        res.status(400).json({'msg': req.i18n.__('Error deleting document(s)') + ': ' + req.i18n.__('Invalid query specified')});
    }
});

// Deletes a document
router.post('/document/:conn/:db/:coll/doc_delete', function (req, res, next){
    var connection_list = req.app.locals.dbConnections;

    // Check for existance of connection
    if(connection_list[req.params.conn] === undefined){
        res.status(400).json({'msg': req.i18n.__('Invalid connection name')});
    }

    // Validate database name
    if(req.params.db.indexOf(' ') > -1){
        res.status(400).json({'msg': req.i18n.__('Invalid database name')});
    }

    // Get DB's form pool
    var mongo_db = connection_list[req.params.conn].native.db(req.params.db);
    common.get_id_type(mongo_db, req.params.coll, req.body.doc_id, function (err, result){
        if(result.doc){
            mongo_db.collection(req.params.coll).deleteOne({_id: result.doc_id_type}).then(
                function (docs){
                    if(docs.deletedCount < 1){
                        console.error('Error deleting document: ' + err);
                        res.status(400).json({'msg': req.i18n.__('Error deleting document') + ': ' + req.i18n.__('Cannot find document by Id')});
                    }else{
                        res.status(200).json({'msg': req.i18n.__('Document successfully deleted')});
                    }
                },
                function (err){
                    console.error('Error deleting document: ' + err);
                    res.status(400).json({'msg': req.i18n.__('Error deleting document') + ': ' + req.i18n.__('Cannot find document by Id')});
                }
            );
        }else{
            console.error('Error deleting document: ' + err);
            res.status(400).json({'msg': req.i18n.__('Cannot find document by Id')});
        }
    });
});

module.exports = router;
