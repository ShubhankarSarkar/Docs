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

/**
 * @class UI test spec
 *
 * @author
 */

var webdriver = require('webdriver-support/node_modules/selenium-webdriver'),
    chai = require('chai'),
    webdriverFactory = require('webdriver-support');

chai.use(require('chai-as-promised'));

describe('Test all the things', function() {

    //Note: this describe() block is required to maintain the 'driver' and 'driverSession' variables below in the correct
    //scope...without this describe(), everything will work when this test spec is run in isolation, but
    //variables will contaminate when run with other specs.

    var driver, driverSession;

    before(function() {
        driverSession = webdriverFactory.create();
        driver = driverSession.setup({spec: __filename});
    });

    after(function(done) {
        driverSession.teardown(done);
    });

    afterEach(function (done) {
        driverSession.logState(this.currentTest, done);
    });

    describe('Test the index view', function() {

        before(function() {
            //returning a promise tells mocha to wait for the promise to resolve before proceeding
            return driver.get('/test/ui/fixtures/sample.html');//can be a path to the application or to the test/ui/fixtures directory (or anywhere else)
        });

        //Option 1: Using chai-as-promised (with "eventually" keyword) to assert across the promise returned by webdriver.
        //Be sure to return the promise from chai-as-promised back to Mocha
        it('should render the index view', function () {
            return chai.expect(driver.findElement(webdriver.By.css("#viewStack .index a"))).to.eventually.exist;
        });

        //Option 2: Using Mocha's "done" function to force Mocha to wait until all promises are resolved.
        //Be sure to call done() when all promises are resolved
        it('should do something', function (done) {

            driver.findElements(webdriver.By.css(".some .css .selector")).then(function(foundElements) {
                chai.expect(foundElements.length).to.equal(16); //Assert: assertion errors will be caught by Mocha
                done(); //tell mocha all async commands (and the test) are done.
            }, done); //any webdriver (not test assertion) error will cause this Mocha done callback to execute and report the error....this is rare

        });

        ///more "it" statements here...
    });

    describe('Test some other group of functionality', function() {

        before(function() {
            return driver.get('/src/some/other/path.html');
        });

        it('should do something', function () {
            //...similar to it statements above...
        });

    });
});
