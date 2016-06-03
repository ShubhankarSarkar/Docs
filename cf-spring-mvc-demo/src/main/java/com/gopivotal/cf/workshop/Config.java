package com.gopivotal.cf.workshop;

import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.Cloud;
import org.springframework.cloud.CloudException;
import org.springframework.cloud.CloudFactory;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class Config {

    
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
