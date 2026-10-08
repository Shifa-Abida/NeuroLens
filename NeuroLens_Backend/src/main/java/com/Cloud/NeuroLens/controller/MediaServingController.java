package com.Cloud.NeuroLens.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://127.0.0.1:3002"})
public class MediaServingController {

    @Value("${neurolens.media.upload-dir:media_storage}")
    private String uploadDir;

    @GetMapping({"/media/{subDir}/{fileName}", "/api/media/{subDir}/{fileName}"})
    public ResponseEntity<Resource> serveMedia(
            @PathVariable String subDir,
            @PathVariable String fileName) {

        Path filePath = Paths.get(uploadDir, subDir, fileName).toAbsolutePath().normalize();
        File file = filePath.toFile();

        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }

        Resource resource = new FileSystemResource(file);
        MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;

        String lowerName = fileName.toLowerCase();
        if (lowerName.endsWith(".webm")) {
            mediaType = MediaType.parseMediaType("video/webm");
        } else if (lowerName.endsWith(".mp4")) {
            mediaType = MediaType.parseMediaType("video/mp4");
        } else if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) {
            mediaType = MediaType.IMAGE_JPEG;
        } else if (lowerName.endsWith(".png")) {
            mediaType = MediaType.IMAGE_PNG;
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(mediaType);
        headers.setContentLength(file.length());
        headers.set(HttpHeaders.ACCEPT_RANGES, "bytes");
        headers.set(HttpHeaders.CACHE_CONTROL, "no-cache");

        return new ResponseEntity<>(resource, headers, HttpStatus.OK);
    }
}
