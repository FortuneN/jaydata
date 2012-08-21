﻿
//not runing in nodejs.....

$data.Class.define('$example.Person', $data.Entity, null, {
    Id: { type: 'string', key: true, computed: true },
    Name: { type: 'string' },
    Description: { type: 'string' },
    Age: { type: 'int' }
});

$data.Class.define('$example.Order', $data.Entity, null, {
    Id: { type: 'string', key: true, computed: true },
    Value: { type: 'int' },
    Date: { type: 'date' },
    Completed: { type: 'bool' }
});

$data.Class.define('$example.Context', $data.EntityContext, null, {
    People: { type: $data.EntitySet, elementType: $example.Person },
    Orders: { type: $data.EntitySet, elementType: $example.Order },
    Delete: $data.EntityContext.generateServiceOperation({ serviceName: 'Delete', returnType: 'string', params: [] })
});

$example.Context.deleteData = function (ctx, callback) {
    callback = $data.typeSystem.createCallbackSetting(callback);

    ctx.onReady(function () {
        ctx.People.toArray(function (p) {
            ctx.Orders.toArray(function (o) {
                for (var i = 0; i < p.length; i++) {
                    ctx.People.remove(p[i]);
                }
                for (var i = 0; i < o.length; i++) {
                    ctx.Orders.remove(o[i]);
                }
                ctx.saveChanges(function () {
                    if (o.length >= $example.Context.generateTestData.itemsInTables || p.length >= $example.Context.generateTestData.itemsInTables) {
                        $example.Context.deleteData(ctx, callback);
                    } else {
                        callback.success();
                    }
                });
            });
        });
    });
};
$example.Context.generateTestData = function (ctx, callback) {
    $example.Context.deleteData(ctx, function () {
        for (var i = 0; i < $example.Context.generateTestData.itemsInTables; i++) {
            ctx.People.add({ Name: 'Person' + i, Description: 'desc' + i, Age: 10 + i });
            ctx.Orders.add({ Value: i * 1000, Date: new Date((2000 + i) + '/01/01'), Completed: i % 2 });
        }

        ctx.saveChanges(callback);
    });
};

$example.Context.generateTestData.serviceurl = 'http://192.168.1.119:3001/testservice';
$example.Context.generateTestData.itemsInTables = 10;
$example.Context.getContext = function () {
    var ctx = new $example.Context({ name: 'oData', oDataServiceHost: $example.Context.generateTestData.serviceurl, serviceUrl: $example.Context.generateTestData.serviceurl });
    return ctx;
};

test("REST - GET types", 6, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.Orders.toArray(function (orders) {
            var order = orders[0];

            equal(order.Date instanceof Date, true, 'date result failed');
            ok(order.Date > new Date(1980), true, 'date result value failed');
            equal(typeof order.Completed, 'boolean', 'bool result failed');
            equal(typeof order.Value, 'number', 'int result failed');
            equal(typeof order.Id, 'string', 'id result failed');
            notEqual(order.Id.indexOf("'"), 0, 'id result failed');

            start();
        });
    });
});

test("REST - GET responseLimit", 3, function () {
    stop();

    var context = $example.Context.getContext();
    var testNum = $example.Context.generateTestData.itemsInTables;
    $example.Context.generateTestData.itemsInTables = 50;

    //$example.Context.deleteData(context, function () {
        $example.Context.generateTestData(context, function () {
            context.People.toArray(function (items) {
                context.People.length(function (count) {
                    equal(items.length, 30, 'items result count failed');

                    equal(count, 50, 'count result failed');
                    equal(typeof count, 'number', 'count result type failed');


                    $example.Context.generateTestData.itemsInTables = testNum;
                    start();
                });
            });
        });
    //});

});

test("REST - GET $Count", 2, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.length(function (count) {
            equal(count, 10, 'count result failed');
            equal(typeof count, 'number', 'count result type failed');
            start();
        });
    });
});

test("REST - GET ById", 4, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.toArray(function (p) {
            var person = p[0];

            OData.request({
                requestUri: $example.Context.generateTestData.serviceurl + "/People('" + person.Id + "')",
                method: 'GET',
                data: undefined
            }, function (data) {

                equal(data.Id, person.Id, 'Id field failed');
                equal(data.Name, person.Name, 'Name field failed');
                equal(data.Description, person.Description, 'Description field failed');
                equal(data.Age, person.Age, 'Age field failed');

                start();
            }, function () {
                console.log(JSON.stringify(arguments));
            });

        });
    });
});

test("REST - GET ById / Property", 4, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.toArray(function (p) {
            var person = p[0];

            OData.request({
                requestUri: $example.Context.generateTestData.serviceurl + "/People('" + person.Id + "')/Name",
                method: 'GET',
                data: undefined
            }, function (data) {

                equal(data.Id, undefined, 'Id field failed');
                equal(data.Name, person.Name, 'Name field failed');
                equal(data.Description, undefined, 'Description field failed');
                equal(data.Age, undefined, 'Age field failed');

                start();
            }, function () {
                console.log(JSON.stringify(arguments));
            });

        });
    });
});

test("REST - POST", 8, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.deleteData(context, function () {
        OData.request({
            requestUri: $example.Context.generateTestData.serviceurl + "/People",
            method: 'POST',
            data: {
                Name: 'JayData',
                Description: 'Desc',
                Age: 27
            }
        }, function (data) {

            notEqual(data.Id, undefined, 'Id field failed');
            equal(data.Name, 'JayData', 'Name field failed');
            equal(data.Description, 'Desc', 'Description field failed');
            equal(data.Age, 27, 'Age field failed');

            context.People.toArray(function (p) {
                var person = p[0];

                notEqual(person.Id, undefined, 'Id field failed');
                equal(person.Name, 'JayData', 'Name field failed');
                equal(person.Description, 'Desc', 'Description field failed');
                equal(person.Age, 27, 'Age field failed');

                start();
            });
        }, function () {
            console.log(JSON.stringify(arguments));
            stop();
        });

    });
});

test("REST - MERGE", 5, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.toArray(function (p) {
            var person = p[0];

            OData.request({
                requestUri: $example.Context.generateTestData.serviceurl + "/People('" + person.Id + "')",
                method: 'MERGE',
                data: {
                    Id: person.Id,
                    Name: 'UpdatedName',
                    Age: 300,
                }
            }, function (data) {

                equal(data, undefined, 'data failed');

                context.People.filter(function (p) { p.Name == 'UpdatedName' }).toArray(function (p2) {
                    var person2 = p2[0];

                    equal(person2.Id, person.Id, 'Id field failed');
                    equal(person2.Name, 'UpdatedName', 'Name field failed');
                    equal(person2.Description, person.Description, 'Description field failed');
                    equal(person2.Age, 300, 'Age field failed');

                    start();
                });

            }, function () {
                console.log(JSON.stringify(arguments));
            });

        });
    });
});

test("REST - DELETE", 2, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.toArray(function (p) {
            var person = p[0];

            OData.request({
                requestUri: $example.Context.generateTestData.serviceurl + "/People('" + person.Id + "')",
                method: 'DELETE',
                data: {
                    Id: person.Id,
                }
            }, function (data) {

                equal(data, undefined, 'data failed');

                context.People.filter(function (p) { p.Id == this.Id }, { Id: person.Id }).toArray(function (p2) {
                    equal(p2.length, 0, 'result failed');

                    start();
                });

            }, function () {
                console.log(JSON.stringify(arguments));
            });

        });
    });
});

test("REST - DELETE batch", 3, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.length(function (count) {
            equal(count, 10, 'result failed');
            context.People.removeAll(undefined, undefined, function (cnt) {
                equal(cnt, 10, 'result failed');
                context.People.length(function (count2) {
                    equal(count2, 0, 'result failed');
                    start();
                });
            });
        });
    });
});

test("REST - DELETE batch filter", 3, function () {
    stop();

    var context = $example.Context.getContext();
    $example.Context.generateTestData(context, function () {
        context.People.length(function (count) {
            equal(count, 10, 'result failed');
            context.People.removeAll(function (p) { return p.Age < 15 }, undefined, function (cnt) {
                equal(cnt, 5, 'result failed');
                context.People.length(function (count2) {
                    equal(count2, 5, 'result failed');
                    start();
                });
            });
        });
    });
});