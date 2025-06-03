/*
This file is generated and isn't the actual source code for this
managed global class.
This read-only file shows the class's global constructors,
methods, variables, and properties.
To enable code to compile, all methods return null.
*/
global class Einstein_PredictionService {
    global String baseUrl;
    global String httpErrorMessage;
    global Integer httpStatusCode;
    global Einstein_PredictionService(einsteinplay.Einstein_PredictionService.Types typeEnum) {

    }
    global Einstein_PredictionService(String bearerToken, einsteinplay.Einstein_PredictionService.Types typeEnum) {

    }
    global einsteinplay.Einstein_Example createFeedbackImageExample(String name, String expectedLabel, String modelId, Blob fileBlob) {
        return null;
    }
    global einsteinplay.Einstein_Example createFeedbackLanguageExample(String expectedLabel, String modelId, String text) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult detectImageBase64(String modelId, String base64, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult detectImageBlob(String modelId, Blob fileBlob, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult detectImageUrl(String modelId, String url, Integer numResults, String sampleId) {
        return null;
    }
    global Boolean isExecuting() {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictImageBase64(String modelId, String base64, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictImageBlob(String modelId, Blob fileBlob, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictImageUrl(String modelId, String url, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictIntent(String modelId, String text, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictNER(String modelId, String text, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, String task, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, String task, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, String task, String formType, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrBase64(String modelId, String base64, String task, String formType, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, String task, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, String task, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, String task, String formType, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictOcrUrl(String modelId, String url, String task, String formType, Integer numResults, String sampleId) {
        return null;
    }
    global einsteinplay.Einstein_PredictionResult predictSentiment(String modelId, String text, Integer numResults, String sampleId) {
        return null;
    }
    global void setLanguage(einsteinplay.Einstein_PredictionService.Languages langEnum) {

    }
    global void setType(einsteinplay.Einstein_PredictionService.Types typeEnum) {

    }
global enum Languages {CHINESE_SIMPLIFIED, CHINESE_TRADITIONAL, ENGLISH_UK, ENGLISH_US, FRENCH, GERMAN, ITALIAN, JAPANESE, PORTUGUESE, SPANISH}
global enum Types {IMAGE, IMAGE_DETECTION, IMAGE_MULTI_LABEL, INTENT, NER, OCR, SENTIMENT}
}
