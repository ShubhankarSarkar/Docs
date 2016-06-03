package com.gopivotal.cf.workshop.web;

import java.io.IOException;
import java.text.DateFormat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.TreeMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.Cloud;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;

import com.fasterxml.jackson.core.JsonParseException;
import com.fasterxml.jackson.databind.JsonMappingException;
import com.gopivotal.cf.workshop.entity.Attendee;
import com.gopivotal.cf.workshop.entity.Session;
import com.gopivotal.cf.workshop.repository.AttendeeRepository;
import com.gopivotal.cf.workshop.repository.SessionRepository;

/**
 * Controller for the Cloud Foundry workshop - Spring MVC version.
 * 
 */
@Controller
public class CloudFoundryWorkshopController {
	
	private static final Logger logger = LoggerFactory.getLogger(CloudFoundryWorkshopController.class);

	@Autowired
	private AttendeeRepository attendeeRepository;
	
	@Autowired
	private SessionRepository sessionRepository;
	
	@Autowired (required=false) Cloud cloud;

	/**
	 * Gets basic environment information.  This is the application's
	 * default action.
	 * @param model The model for this action.
	 * @return The path to the view.
	 * @throws IOException 
	 * @throws JsonMappingException 
	 * @throws JsonParseException 
	 */
	@RequestMapping(value = "/", method = RequestMethod.GET)
	public String index(Model model) throws Exception {
			
		Date date = new Date();
		DateFormat dateFormat = new SimpleDateFormat("MM/dd/yyyy h:mm a");
		String serverTime = dateFormat.format(date);
		model.addAttribute("serverTime", serverTime);
		
		String port = System.getenv("PORT");
		model.addAttribute("port", port);

		String vcapServices = System.getenv("VCAP_SERVICES");
		model.addAttribute("vcapServices", vcapServices);
		
		if (cloud == null ){
			model.addAttribute("isCloudEnvironment",false);
		} else {
			model.addAttribute("isCloudEnvironment",true);
			model.addAttribute("vcapApplication", cloud.getApplicationInstanceInfo().getProperties());
			logger.info("VCAP_SERVICES [{}] ", vcapServices);
			logger.info("VCAP_APPLICATION [{}] ", System.getenv("VCAP_APPLICATION"));
		}
		
		logger.info("Current date and time = [{}], port = [{}].", serverTime, port);

		return "index";
	}
	
	/**
	 * Action to get a list of all attendees.
	 * @param model The model for this action.
	 * @return The path to the view.
	 */
	@RequestMapping(value = "/attendees", method = RequestMethod.GET)
	public String attendees(Model model) {
		
		Iterable<Attendee> attendees = attendeeRepository.findAll();
	
		model.addAttribute("attendees", attendees);
		return "attendees";
	}
	
	/**
	 * Action to get a list of all of the sessions for the specified attendee.
	 * @param attendeeId The ID of the attendee to get the sessions for.
	 * @param model The model for this action.
	 * @return The path to the view.
	 */
	@RequestMapping(value = "/sessions", method = RequestMethod.GET)
	public String sessions(@RequestParam("attendeeId") Long attendeeId, Model model) {
		
		Attendee attendee = attendeeRepository.findOne(attendeeId);
		List<Session> sessions = sessionRepository.findByAttendee(attendee);
		model.addAttribute("attendee", attendee);
		model.addAttribute("sessions", sessions);
		
		return "sessions";
	}

	@RequestMapping(value = "/environment", method = RequestMethod.GET)
	public String environment(Model model) throws Exception {
			
		//	Dump the environment variables to the page.  
		//	The TreeMap produces alphabetical order:
		model.addAttribute(
			"environmentVariables", 
			new TreeMap<String,String>(System.getenv()));

		return "env";
	}
	
	/**
	 * Action to initiate shutdown of the system.  In CF, the application 
	 * <em>should</em>f restart.  In other environments, the application
	 * runtime will be shut down.
	 */
	@RequestMapping(value = "/kill", method = RequestMethod.GET)
	public void kill() {
		
		logger.warn("*** The system is shutting down. ***");
		System.exit(-1);
		
	}

}
