/*
 * Copyright (c) 2013 GE Global Research. All rights reserved.
 *
 * The copyright to the computer software herein is the property of
 * GE Global Research. The software may be used and/or copied only
 * with the written permission of GE Global Research or in accordance
 * with the terms and conditions stipulated in the agreement/contract
 * under which the software has been supplied.
 */

/**
 * Node module for use as a required module inside a selenium-webdriver test spec.  Expected usage:
 *
 * my-spec.js:
 * ----------------------
 * var webdriver = require('selenium-webdriver'),
 * mocha = require('selenium-webdriver/testing'),
 * chai = require('chai'),
 * webdriverFactory = require('test-dependencies').webdriverFactory;
 *
 * var driver;
 *
 * before(function() {
     *    driver = webdriverFactory.setup();
     * });
 *
 * after(function(done) {
     *      webdriverFactory.teardown(done);
     * });
 *
 * mocha.describe('My suite', function() {
     *    ...mocha tests go here...
     * };
 * ----------------------
 *
 * @author Jeff Reichenberg
 */

var webdriver = require('selenium-webdriver'),
    firefox = require('selenium-webdriver/firefox'),
    chrome = require('selenium-webdriver/chrome'),
    chromedriver = require('chromedriver'),
    path = require('path'),
    util = require('util'),
    fs = require('fs'),
    merge = require('merge');

var saucePrefix = 'SL';

var driverNames = {
    phantomjs: webdriver.Browser.PHANTOM_JS,
    firefox: webdriver.Browser.FIREFOX,
    chrome: webdriver.Browser.CHROME,
    safari: webdriver.Browser.SAFARI,
    SL_internetExplorer: webdriver.Browser.INTERNET_EXPLORER,
    SL_chrome: webdriver.Browser.CHROME,
    SL_firefox: webdriver.Browser.FIREFOX,
    SL_safari: webdriver.Browser.SAFARI,
    SL_iphone: webdriver.Browser.IPHONE,
    SL_ipad: webdriver.Browser.IPAD
};

var saucePlatforms = {
    windows7: 'Windows 7',
    windows8: 'Windows 8.1',
    mac10_9: 'OS X 10.9'
};

/**
 * Works around an issue with mocha's TAP reporter, see https://github.com/visionmedia/mocha/issues/1257
 */
function proxyConsoleLogForTapReporter() {
    var consoleLogOrig = console.log;
    console.log = function (msg) {
        if (msg && msg.search && msg.search(/^   *at/m) !== -1) {
            msg = msg.replace(/^/gm, '#');
        }
        var args = arguments.length > 1 ? Array.prototype.slice.call(arguments, 1) : [];
        if (msg || arguments.length > 0) {
            args.unshift(msg);
        }
        consoleLogOrig.apply(global, args);
    }
}
proxyConsoleLogForTapReporter();

function resolveCapabilities(opts, isSauce) {
    var capabilities;
    if (isSauce) {
        capabilities = {
            browserName: opts.driverName,
            platform: opts.platform,
            version: opts.version,
            name: opts.testName,
            username: process.env.SAUCE_USER_NAME,
            accessKey: process.env.SAUCE_API_KEY,
            "capture-html": true
        }
    }
    else {
        capabilities = webdriver.Capabilities[opts.driverName]();
    }
    return capabilities;
}

function startWebdriver(driverSession) {
    var driver = driverSession.driver;
    stopWebdriver(driver); // cleanup any running instance
    if (!driverSession.isSauce && driverSession.opts.driverName === driverNames.chrome) {
        if (process.env.PATH.indexOf("chromedriver") === -1) {
            console.log("Adding to PATH " + path.dirname(chromedriver.path));
            process.env.PATH = process.env.PATH + ":" + path.dirname(chromedriver.path);
        }
        //driver = new chrome.Driver();

        driver = new webdriver.Builder().
            withCapabilities(webdriver.Capabilities.chrome()).
            build();
    }
    else if (!driverSession.isSauce && driverSession.opts.driverName === driverNames.firefox) {
        driver = new firefox.Driver();
    }
    else {
        var builder = new webdriver.Builder().
            withCapabilities(resolveCapabilities(driverSession.opts)).
            usingServer(process.env.seServer);

        var myOS = require('os').platform();
        var pjspath = __dirname + "/../../../node_modules/phantomjs/bin/phantomjs";
        if (myOS.substr(0,3) == "win") {
            // Node.js script doesn't work on windows as executable script, and we can't launch it with Node because
            // we aren't controlling the spawn....so lets point to the real exe
            pjspath =  __dirname + "/../../../node_modules/phantomjs/lib/phantom/phantomjs.exe";
        }

        builder.getCapabilities().set("phantomjs.binary.path", pjspath);
        driver = builder.build();
    }
    //override
    var defaultGet = driver.get;
    driver.get = function(url) {
        var resolvedUrl = url;
        if (resolvedUrl.indexOf("http") !== 0) {
            resolvedUrl = process.env.autUrl + driverSession.opts.specPath + url;
        }
        console.log("Webdriver navigating to " + resolvedUrl);
        return defaultGet.call(driver, resolvedUrl);
    };
    driver.manage().window().setSize(driverSession.opts.windowWidth, driverSession.opts.windowHeight);
    driverSession.driver = driver;
    return driver;
}

function stopWebdriver(driver) {
    var promise;
    if (driver) {
        try {
            driver.close(); //not implemented in sauce ipad driver
        }
        catch (e) {
            //not implemented in sauce ipad driver...eat it
        }
        promise = driver.quit();
    }
    return promise;
}

function resolveVissert() {
    try {//if vissert and chai and chai-as-promised are in the root project, wire them up to avoid the timing issue of https://github.com/domenic/chai-as-promised/issues/70
        var vissert = require(path.resolve('.','node_modules/vissert')),
            chai = require(path.resolve('.','node_modules/chai'));
        if (vissert && chai) {
            chai.use(vissert.chaiVissert);
            chai.use(require(path.resolve('.','node_modules/chai-as-promised')));
            console.log("Wired up vissert and chai-as-promised");
        }
    }
    catch (e) {
        console.log("Not wiring up vissert + chai-as-promised");
    }
}

var _driverSession = {

    driver: null,
    isSauce: false,
    opts: null,

    setup: function(options) {
        var defaultOptions = {
            driverName: process.env.webdriver || 'phantomjs',
            windowWidth: 1024,
            windowHeight: 768,
            platform: process.env.platform || 'windows8',
            version: process.env.version,
            testName: null
        };

        var opts = merge(/*clone*/true, defaultOptions, options);
        this.isSauce = opts.driverName.indexOf(saucePrefix) === 0;

        if (!opts.testName) {
            opts.testName = opts.spec ? path.basename(opts.spec, '.js') : "Unnamed test";
        }

        opts.specPath = "";
        if (opts.spec) {
            var specDir = path.dirname(opts.spec);
            opts.specPath = path.relative(process.cwd(), specDir) + path.sep;
            opts.specPath = opts.specPath.replace(/\\/g, "/");
        }

        if (!driverNames[opts.driverName]) {
            throw new Error("Webdriver '" + opts.driverName + "' is not supported. Use one of " + util.inspect(driverNames));
        }
        else {
            opts.driverName = driverNames[opts.driverName];
        }

        if (this.isSauce) {
            if (!saucePlatforms[opts.platform]) {
                throw new Error("Sauce platform '" + opts.platform + "' is not supported. Use one of " + util.inspect(saucePlatforms));
            }
            else {
                opts.platform = saucePlatforms[opts.platform];
            }
            opts.testName = opts.testName + ":" + opts.driverName + (opts.version ? ":" + opts.version : "");
        }
        this.opts = opts;

        resolveVissert();

        return startWebdriver(this);
    },

    teardown: function(done) {
        var promise = stopWebdriver(this.driver);
        if (done) {
            if (promise) {
                promise.then(done, done);
            }
            else {
                done();
            }
        }
        return promise;
    },

    /**
     * Attach screenshot and DOM dump to Mocha test's err object upon failure for later reporting
     *
     * @param mochaTest The current Mocha test instance
     * @param mochaDone Mocha's async "done" function passed from an after/afterEach function
     */
    logState: function(mochaTest, mochaDone) {
        var _this = this;
        if (mochaTest.state !== 'passed' && !mochaTest.alreadyLogged) {
            mochaTest.alreadyLogged = true; // for some reason, tests pass through here twice...not sure why, but block it for now.
            _this.driver.wait(function () {
                //make sure all webdriver promises are done resolving...
                if (_this.driver.controlFlow().getSchedule().search(/[^\]\[]/) === -1) {
                    console.log("  ---");
                    var debugStr = "";
                    var imgStr;
                    var writeFileToTap = !(mochaTest.err.message && mochaTest.err.message.indexOf("diff saved to") !== -1);
                    _this.driver.getCurrentUrl().then(function (location) {
                        debugStr += "Failed on page " + location + "\n\nFailure '" + mochaTest.err.message + "'\n\nStack:\n" + mochaTest.err.stack + "\n\n";
                    }).then(function () {
                        _this.driver.executeScript("return document.documentElement.outerHTML").then(function (dom) {
                            debugStr += dom;
                            if (writeFileToTap) {
                                console.log("  Failure Info:");
                                console.log("    File-Name: failure.txt");
                                console.log("    File-Content: " + new Buffer(debugStr).toString('utf8'));
                                console.log("    File-Type: text/plain");
                            }
                        });
                    }).then(function () {
                        _this.driver.takeScreenshot().then(function (img) {
                            if (writeFileToTap) {
                                console.log("  Screenshot:");
                                console.log("    File-Name: screenshot.png");
                                console.log("    File-Content: " + img);
                                console.log("    File-Type: image/png");
                            }
                            imgStr = img;
                        });
                    }).then(function () {
                        console.log("  ...");
                        var reportsDir = path.dirname(mochaTest.file) + "/../reports/"; //assume we are in a "spec" directory and reports should be a level up
                        if (!fs.existsSync(reportsDir)) {
                            fs.mkdirSync(reportsDir);
                        }
                        var fileTitle = mochaTest.title + "-" + _this.opts.driverName;
                        fs.writeFileSync(reportsDir + fileTitle + ".png", new Buffer(imgStr, 'base64'));
                        fs.writeFileSync(reportsDir + fileTitle + ".txt", new Buffer(debugStr, 'utf8'));
                        mochaDone();
                    }, mochaDone);
                    return true;
                }
                else {
                    return false;
                }
            }, 12000);
        }
        else {
            mochaDone();
        }
    }
};

module.exports = {
    create: function() {
        return Object.create(_driverSession);
    },

    saucePrefix: saucePrefix
};

