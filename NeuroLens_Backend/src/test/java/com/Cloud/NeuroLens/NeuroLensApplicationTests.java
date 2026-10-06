package com.Cloud.NeuroLens;

import com.Cloud.NeuroLens.model.Person;
import com.Cloud.NeuroLens.repository.PersonRepository;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

@SpringBootTest
class NeuroLensApplicationTests {

	@Autowired
	private PersonRepository personRepository;

	@Test
	void contextLoads() {
	}

	@Test
	void savesPersonFaceDataAsJson() {
		Person person = Person.builder()
				.name("Test Person")
				.relationship("Friend")
				.faceEmbeddings(List.of(List.of(0.1, 0.2, 0.3)))
				.faceSnapshots(List.of("data:image/jpeg;base64,test"))
				.build();

		Person saved = personRepository.save(person);
		Person loaded = personRepository.findById(saved.getId()).orElseThrow();

		Assertions.assertEquals("Test Person", loaded.getName());
		Assertions.assertEquals(person.getFaceEmbeddings(), loaded.getFaceEmbeddings());
		Assertions.assertEquals(person.getFaceSnapshots(), loaded.getFaceSnapshots());
	}

}
