Spring MVC Demo
===============

Introduction
------------

A simple Spring MVC application to demonstrate use of environment variables when running inside CF.

Building, Packaging, and Deploying
----------------------------------

A WAR file has already been built and is in the `pre-built` directory, with a sample `manifest.yml`.

If you wish, you can build using maven or Gradle as you prefer.

    mvn clean package
    gradle clean assemble

To run: first modify the `manifest.yml` and set `path` and `host` then push to CF:

    cf push



Stack
-------
The application uses Spring 4, Spring Boot, Spring Cloud, and Thymeleaf.
