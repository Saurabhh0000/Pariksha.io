package io.pariksha.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.pariksha.entity.Address;
import io.pariksha.enums.AddressType;


@Repository
public interface AddressRepository extends JpaRepository<Address, Long>{
	
	Optional<Address> findByIdAndAddressType(Long id, AddressType addressType);
	

}
