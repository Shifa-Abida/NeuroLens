package com.Cloud.NeuroLens.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class MediaStorageService {

    @Value("${neurolens.media.upload-dir:media_storage}")
    private String uploadDir;

    public String storeVideo(MultipartFile file) throws IOException {
        return storeFile(file, "videos", ".webm");
    }

    public String storePhoto(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename();
        String ext = ".jpg";
        if (originalFilename != null && originalFilename.lastIndexOf('.') > 0) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }
        return storeFile(file, "photos", ext);
    }

    private String storeFile(MultipartFile file, String subDir, String defaultExt) throws IOException {
        if (file == null || file.isEmpty() || file.getSize() <= 0) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        Path targetDir = Paths.get(uploadDir, subDir).toAbsolutePath().normalize();
        File dir = targetDir.toFile();
        if (!dir.exists()) {
            dir.mkdirs();
        }

        String originalFilename = file.getOriginalFilename();
        String ext = defaultExt;
        if (originalFilename != null && originalFilename.contains(".")) {
            ext = originalFilename.substring(originalFilename.lastIndexOf('.'));
        }

        String uniqueFileName = UUID.randomUUID().toString() + "_" + System.currentTimeMillis() + ext;
        Path targetPath = targetDir.resolve(uniqueFileName);

        Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

        // Return relative URL that WebConfig maps to /media/**
        return "/media/" + subDir + "/" + uniqueFileName;
    }

    public boolean deleteMedia(String mediaUrl) {
        if (mediaUrl == null || mediaUrl.isBlank()) {
            return false;
        }

        try {
            // Strip /media/ prefix if present
            String relative = mediaUrl;
            if (relative.startsWith("/media/")) {
                relative = relative.substring("/media/".length());
            } else if (relative.contains("/media/")) {
                relative = relative.substring(relative.indexOf("/media/") + "/media/".length());
            }

            Path filePath = Paths.get(uploadDir).resolve(relative).toAbsolutePath().normalize();
            File file = filePath.toFile();
            if (file.exists() && file.isFile()) {
                return file.delete();
            }
        } catch (Exception e) {
            System.err.println("Error deleting media file: " + e.getMessage());
        }
        return false;
    }
}
