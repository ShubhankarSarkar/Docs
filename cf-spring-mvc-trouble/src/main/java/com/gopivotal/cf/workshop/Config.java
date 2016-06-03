package com.gopivotal.cf.workshop;

import java.util.ArrayList;
import java.util.List;

import javax.annotation.PostConstruct;

import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.Cloud;
import org.springframework.cloud.CloudException;
import org.springframework.cloud.CloudFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;

@SpringBootApplication
public class Config {

    @PostConstruct
    public void consumeAllMemory() {

    	//	TODO:  LOOK HERE!   LOOK HERE!   LOOK HERE!
    	//	      BAD CODE!    BAD CODE!    BAD CODE!
    	//	The code you see here will consume all available memory allocated 
    	//	to the application instance.  Comment out this code and re-push

		List<Double> list = new ArrayList<Double>();
    	while (true) {
			list.add(Math.random());
		}		    	

    	//	End of bad code.
    }
	
	
    //	Access Cloud-specific information in a cloud-neutral way:
    @Bean
    public Cloud cloudFactory() {

    	try {
    		return new CloudFactory().getCloud();
    	} catch ( CloudException ce ) {
    		//	Not running in cloud environment, return null
    		return null;
    	}
    }
}
