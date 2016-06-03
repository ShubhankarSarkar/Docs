package com.ge.predix.solsvc.training.alarmservice.repository;

import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import com.ge.predix.solsvc.training.alarmservice.entity.HospitalEntity;

@Repository
public interface IHospitalEntityRepository extends CrudRepository<HospitalEntity, Long>
{
	/**
 	* Find by id
 	*
 	* @param id Reference to the hospital’s id
 	* @return HospitalEntity object
 	*/
 	HospitalEntity findOne(Long id);
}
