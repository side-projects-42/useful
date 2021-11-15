/**
 * Created by Kristof on 10/03/2015.
 */

QUnit.module("Indexes");
QUnit.test("Creating Index", function(assert) {
    var done = assert.async();
    assert.expect(4);

    initionalSituationObjectStore(
        function() {
            var request = indexedDb.open(dbName, 2);
            request.onsuccess = function(e) {
                try {
                    var transaction = e.target.result.transaction([
                        objectStoreName,
                    ]);
                    var objectstore = transaction.objectStore(objectStoreName);

                    for (var i = 0; i < objectstore.indexNames.length; i++) {
                        if (objectstore.indexNames[i] === indexProperty) {
                            assert.ok(true, "Index present");
                        }
                    }

                    transaction.oncomplete = function(e) {
                        e.target.db.close();
                        done();
                    };
                    transaction.onabort = function() {
                        assert.ok(false, "Transaction aborted");
                        e.target.result.close();
                        done();
                    };
                    transaction.onerror = function() {
                        assert.ok(false, "Transaction error");
                        e.target.result.close();
                        done();
                    };
                } catch (ex) {
                    assert.ok(false, "Transaction error");
                    e.target.result.close();
                    done();
                }
            };
            request.onerror = function() {
                assert.ok(false, "Database error");
                done();
            };
            request.onupgradeneeded = function(e) {
                if (e.type == "upgradeneeded") {
                    try {
                        var objectStore = e.target.transaction.objectStore(
                            objectStoreName,
                        );
                        var index = objectStore.createIndex(
                            indexProperty,
                            indexProperty,
                        );
                        assert.ok(true, "Index created");
                        assert.equal(index.name, indexProperty, "index name");
                        assert.equal(
                            index.keyPath,
                            indexProperty,
                            "index keyPath",
                        );
                    } catch (ex) {
                        assert.ok(false, "Creating index failed");
                    }
                }
            };
        },
        done,
        assert,
    );
});
QUnit.test("Creating Index with options", function(assert) {
    var done = assert.async();
    assert.expect(6);

    var unique = true;
    var multiEntry = true;
    initionalSituationObjectStore(
        function() {
            var request = indexedDb.open(dbName, 2);
            request.onsuccess = function(e) {
                try {
                    var transaction = e.target.result.transaction([
                        objectStoreName,
                    ]);
                    var objectstore = transaction.objectStore(objectStoreName);

                    for (var i = 0; i < objectstore.indexNames.length; i++) {
                        if (objectstore.indexNames[i] === indexProperty) {
                            assert.ok(true, "Index present");
                        }
                    }

                    transaction.oncomplete = function(e) {
                        e.target.db.close();
                        done();
                    };
                    transaction.onabort = function() {
                        assert.ok(false, "Transaction aborted");
                        e.target.result.close();
                        done();
                    };
                    transaction.onerror = function() {
                        assert.ok(false, "Transaction error");
                        e.target.result.close();
                        done();
                    };
                } catch (ex) {
                    assert.ok(false, "Transaction error");
                    e.target.result.close();
                    done();
                }
            };
            request.onerror = function() {
                assert.ok(false, "Database error");
                done();
            };
            request.onupgradeneeded = function(e) {
                if (e.type == "upgradeneeded") {
                    try {
                        var objectStore = e.target.transaction.objectStore(
                            objectStoreName,
                        );
                        var index = objectStore.createIndex(
                            indexProperty,
                            indexProperty,
                            {
                                unique: unique,
                                multiEntry: multiEntry,
                            },
                        );
                        assert.ok(true, "Index created");
                        assert.equal(index.name, indexProperty, "index name");
                        assert.equal(
                            index.keyPath,
                            indexProperty,
                            "index keyPath",
                        );
                        assert.equal(
                            index.unique,
                            unique,
                            "index unique attribute",
                        );
                        if (index.multiEntry) {
                            assert.equal(
                                index.multiEntry,
                                multiEntry,
                                "index multiEntry attribute",
                            );
                        } else {
                            assert.ok(
                                true,
                                "IE doesn't implement multiEntry yet.",
                            );
                        }
                    } catch (ex) {
                        assert.ok(false, "Creating index failed");
                    }
                }
            };
        },
        done,
        assert,
    );
});
QUnit.test("Opening Index", function(assert) {
    var done = assert.async();
    assert.expect(1);

    initionalSituationIndex(
        function() {
            var request = indexedDb.open(dbName, 2);
            request.onsuccess = function(e) {
                try {
                    var transaction = e.target.result.transaction([
                        objectStoreName,
                    ]);
                    var objectstore = transaction.objectStore(objectStoreName);
                    var index = objectstore.index(indexProperty);

                    if (index) {
                        assert.ok(true, "Index open");
                    }

                    transaction.oncomplete = function(e) {
                        e.target.db.close();
                        done();
                    };
                    transaction.onabort = function() {
                        assert.ok(false, "Transaction aborted");
                        e.target.result.close();
                        done();
                    };
                    transaction.onerror = function() {
                        assert.ok(false, "Transaction error");
                        e.target.result.close();
                        done();
                    };
                } catch (ex) {
                    assert.ok(false, "Transaction error");
                    e.target.result.close();
                    done();
                }
            };
            request.onerror = function() {
                assert.ok(false, "Database error");
                done();
            };
        },
        done,
        assert,
    );
});
QUnit.test("Opening Index - non existing index", function(assert) {
    var done = assert.async();
    assert.expect(1);

    var anotherIndex = "anotherIndex";
    initionalSituationIndex(
        function() {
            var request = indexedDb.open(dbName, 2);
            request.onsuccess = function(e) {
                try {
                    var transaction = e.target.result.transaction([
                        objectStoreName,
                    ]);
                    var objectstore = transaction.objectStore(objectStoreName);

                    try {
                        var index = objectstore.index(anotherIndex);
                        assert.ok(false, "Index open");
                    } catch (ex) {
                        assert.ok(true, "Index error");
                    }

                    transaction.oncomplete = function(e) {
                        e.target.db.close();
                        done();
                    };
                    transaction.onabort = function() {
                        e.target.result.close();
                        done();
                    };
                    transaction.onerror = function() {
                        assert.ok(false, "Transaction error");
                        e.target.result.close();
                        done();
                    };
                } catch (ex) {
                    assert.ok(false, "Transaction error");
                    e.target.result.close();
                    done();
                }
            };
            request.onerror = function() {
                assert.ok(false, "Database error");
                done();
            };
        },
        done,
        assert,
    );
});
QUnit.test("Deleting Index", function(assert) {
    var done = assert.async();
    assert.expect(1);

    initionalSituationIndex(
        function() {
            var request = indexedDb.open(dbName, 2);
            request.onsuccess = function(e) {
                try {
                    var transaction = e.target.result.transaction([
                        objectStoreName,
                    ]);
                    var objectstore = transaction.objectStore(objectStoreName);

                    for (var i = 0; i < objectstore.indexNames.length; i++) {
                        if (objectstore.indexNames[i] === indexProperty) {
                            assert.ok(false, "Index present");
                        }
                    }

                    transaction.oncomplete = function(e) {
                        e.target.db.close();
                        done();
                    };
                    transaction.onabort = function() {
                        assert.ok(false, "Transaction aborted");
                        e.target.result.close();
                        done();
                    };
                    transaction.onerror = function() {
                        assert.ok(false, "Transaction error");
                        e.target.result.close();
                        done();
                    };
                } catch (ex) {
                    assert.ok(false, "Transaction error");
                    e.target.result.close();
                    done();
                }
            };
            request.onerror = function() {
                assert.ok(false, "Database error");
                done();
            };
            request.onupgradeneeded = function(e) {
                if (e.type == "upgradeneeded") {
                    try {
                        var objectStore = e.target.transaction.objectStore(
                            objectStoreName,
                        );
                        var index = objectStore.deleteIndex(indexProperty);
                        assert.ok(true, "Index deleted");
                    } catch (ex) {
                        assert.ok(false, "Creating index failed");
                    }
                }
            };
        },
        done,
        assert,
    );
});
