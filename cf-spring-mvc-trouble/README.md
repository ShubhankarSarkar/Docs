Spring MVC Trouble
==================

Introduction
------------

This is the same application as the `mvc-spring-demo` but it has been deliberately broken to cause a stack-overflow (preventing deploymnet).

The aim of the exercise is to find the bug and fix it.

Building, Packaging, and Deploying
----------------------------------

A WAR file has already been built and is in the pre-built directory.

If you wish, you can build using maven or Gradle as you prefer.

    mvn clean package
    gradle clean assemble

To run: first modify the manifest.yml and set path and host then push to CF:

    cf push cf-trouble -m 512M -n <unique-host-name> -p pre-built/cf-spring-mvc-trouble-0.0.1-SNAPSHOT.war
    
To do the exercise it is better to load this project into STS/Eclipse as an exiting maven project and deploy and debug from withing the IDE.  You can then find the bad code, fix it and redeploy.

Stack
-----

The application uses Spring 4, Spring Boot, Spring Cloud, and Thymeleaf.

