package com.Cloud.NeuroLens.dto;

import lombok.Data;
import java.util.List;

@Data
public class PersonRecognizeRequestDto {
    private List<Double> embedding;
}
