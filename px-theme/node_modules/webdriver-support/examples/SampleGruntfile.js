'use strict';

module.exports = function (grunt) {

    grunt.initConfig({

        clean: {
            test: ['test/ui/report*']
        },

        webdriver: {
            options: {
                specFiles: ['test/ui/**/*spec.js']
            },
            something: {
                webdrivers: ['phantomjs']
            },
            another: {
                webdrivers: [
                    'SL_firefox', // run firefox on Sauce labs, using default version and OS
                    {
                        driverName: 'SL_internetExplorer',
                        version: 11,
                        platform: 'windows8'
                    }
                ]
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('webdriver-support');

    grunt.registerTask('test', 'Run full test suite', [
        'clean:test',
        'jshint',
        'webdriver',
        'more-test-tasks...'
    ]);
};
