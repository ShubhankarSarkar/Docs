'use strict';

/*
 * Copyright (c) 2014 GE Global Research. All rights reserved.
 *
 * The copyright to the computer software herein is the property of
 * GE Global Research. The software may be used and/or copied only
 * with the written permission of GE Global Research or in accordance
 * with the terms and conditions stipulated in the agreement/contract
 * under which the software has been supplied.
 */

var path = require('path'),
    fs = require('fs'),
    merge = require('merge'),
    webdriverFactory = require('../src/js/webdriver-factory'),
    SeleniumServer = require('selenium-webdriver/remote').SeleniumServer,
    httpServer = require('http-server'),
    portfinder = require('portfinder'),
    q = require('q');

module.exports = function(grunt) {

    var _localSeServer;
    var _sauceConnectAddress = 'http://localhost:4445/wd/hub';
    var _runStack = [];
    var _noErrors = true;

    var _defaultOptions = {
        reporter: (process.env.JENKINS_URL ? 'TAP' : 'spec'),
        reportFile: (process.env.JENKINS_URL ? 'test/ui/reports/report.tap' : null),
        timeout: 60000,
        webdrivers: ['phantomjs'],
        httpRoots: ['./', '/bower_components'],
        autUrl: null
    };

    function _resolveSeleniumServerForDriver(driverName) {
        var startPromise;
        var isSauce = driverName.indexOf(webdriverFactory.saucePrefix) === 0;
        if (isSauce) {
            var deferred = q.defer();
            startPromise = deferred.promise;
            deferred.resolve(_sauceConnectAddress);
            return startPromise;
        }
        else {
            if (!_localSeServer) {
                _localSeServer = new SeleniumServer(__dirname + "/../lib/selenium-server-standalone.jar", {/* show errors? uncomment this stdio: 'inherit'*/});
                _localSeServer.start();
            }
            startPromise = _localSeServer.address();
            startPromise.then(function(address) {
                console.log("Got seServer address: " + address);
            });

            return startPromise;
        }
    }

    function _stopSeleniumServer() {
        if (_localSeServer && _localSeServer.stop) {
            _localSeServer.stop();
            console.log("Selenium Server stopped");
        }
        _localSeServer = null;
    }

    function _startLocalHttpServer(options, foundPort) {
        var httpServerOpts = {
            root : options.httpRoots[0],
            cache: -1,
            silent: false
        };

        if (options.httpRoots.length > 1) {
            //this is the magic step for web components...reroutes potential 404s to try the dependencies directory
            httpServerOpts.proxy = 'http://0.0.0.0:' + foundPort + options.httpRoots[1];
        }

        var localHttpServer = httpServer.createServer(httpServerOpts);

        options.autUrl = "http://localhost:" + foundPort + "/";

        localHttpServer.listen(foundPort, "0.0.0.0", function() {
            console.log("Local http server listening at " + options.autUrl);
        });

        return localHttpServer;
    }

    function _stopLocalHttpServer(localHttpServer) {
        if (localHttpServer) {
            localHttpServer.close();
        }
    }

    function _resolveRunStack(webdrivers) {
        webdrivers.forEach(function (webdriver) {
            if (typeof webdriver === 'string') {
                _runStack.push({driverName: webdriver});
            }
            else {
                _runStack.push(webdriver);
            }
        });
    }

    function _end(options, gruntDone) {
        _stopLocalHttpServer(options.localHttpServer);
        options.localHttpServer = null;
        gruntDone(_noErrors);
    }

    function _runNext(options, gruntDone) {
        if (_runStack.length === 0) {
            _end(options, gruntDone);
        }
        else {
            var toRun = _runStack.shift();
            var seServerAddressPromise = _resolveSeleniumServerForDriver(toRun.driverName);
            seServerAddressPromise.then(function(address) {
                process.env['seServer'] = address;
                process.env['webdriver'] = toRun.driverName;
                process.env['webdriverPlatform'] = toRun.platform;
                process.env['webdriverVersion'] = toRun.version;
                process.env['autUrl'] = options.autUrl;
                console.log('Running tests on ' + process.env.webdriver + ' driver');

                var reportFile;
                if (options.reportFile) {
                    var fileName = options.reportFile;
                    if (!fs.existsSync(path.dirname(fileName))) {
                        fs.mkdirSync(path.dirname(fileName));
                    }
                    var fileNameParts = fileName.split('.');
                    fileName = fileNameParts[0] + new Date().getTime() + '.' + fileNameParts[1];
                    reportFile = fs.createWriteStream(fileName);
                }

                //Run mocha programatically...this doesn't work for multiple runs due to https://github.com/mochajs/mocha/issues/736
                //TODO: when that issue is fixed, switch to the code below...
//            var Mocha = require('mocha');
//            var mocha = new Mocha(options);
//            options.files.forEach(function (specFile) {
//                mocha.addFile(specFile);
//            });
//
//            mocha.run(function (failures) {
//                if (!_error && failures) {
//                    _error = new Error("Mocha task failed: " + failures);
//                }
//                _stopSeleniumServer(); //TODO: use selenium hub so each driver doesn't need its own selenium server instance
//                _runNext(options, gruntDone);
//            });

                var mochaArgs = [__dirname + '/../node_modules/mocha/bin/mocha'];
                for (var key in options) {
                    if (options.hasOwnProperty(key)) {
                        if (key !== 'files' && key !== 'saveReportFile') {
                            mochaArgs.push('--' + key);
                            mochaArgs.push(options[key]);
                        }
                    }
                }
                mochaArgs = mochaArgs.concat(options.files);
                var mochaRun = grunt.util.spawn({
                    cmd: 'node',
                    args: mochaArgs
                }, function (error, result, code) {
                    if (error) {
                        _noErrors = false;
                    }
                    _stopSeleniumServer(); //TODO: use selenium hub so each driver doesn't need its own selenium server instance
                    _runNext(options, gruntDone);
                });
                mochaRun.stdout.pipe(process.stdout);
                if (reportFile) {
                    mochaRun.stdout.pipe(reportFile);
                }
                mochaRun.stderr.pipe(process.stderr);
            });
        }
    }

    grunt.registerMultiTask('webdriver', 'Starting webdriver and running tests', function () {
        // Merge task-specific and/or target-specific options with these defaults.
        var resolvedOptions = merge(/*clone*/true, this.options(_defaultOptions), this.data);

        //sanity check
        if (!resolvedOptions.specFiles || !resolvedOptions.specFiles.slice || resolvedOptions.specFiles.length === 0) {
            throw new Error("You must specify a 'files' option as an Array, e.g. files: ['test/ui/**/*spec.js']");
        }

        //resolve spec files to eventually pass into mocha
        var expandedSpecFiles = grunt.file.expand(resolvedOptions.specFiles);
        resolvedOptions.files = [];
        expandedSpecFiles.forEach(function(specFile) {
            resolvedOptions.files.push(path.resolve(specFile));
        });
        delete resolvedOptions.specFiles;

        //All options are passed-through to mocha, except "webdrivers"...pull that out.
        var webdrivers = resolvedOptions.webdrivers;
        delete resolvedOptions.webdrivers;

        //For now...stack the different browser names and execute them in serial each against their own SeleniumServer instance. TODO: use webdriver hub
        _resolveRunStack(webdrivers);

        var gruntDone = this.async();

        if (!resolvedOptions.autUrl) {
            if (resolvedOptions.httpRoots.length > 2) {
                console.log("The maximum number of httpRoots is 2, default is ['./', './bower_components']");
                gruntDone(false);
            }
            if (resolvedOptions.httpRoots.length === 0) {
                console.log("You must configure at least one httpRoot, default is ['./', './bower_components']");
                gruntDone(false);
            }
            portfinder.getPort({port: 8080}, function (err, foundPort) {
                if (err) {
                    console.log(err.message);
                    gruntDone(false);
                }
                resolvedOptions.localHttpServer = _startLocalHttpServer(resolvedOptions, foundPort);
                _runNext(resolvedOptions, gruntDone);
            });
        }
        else {
            _runNext(resolvedOptions, gruntDone);
        }
    });
};